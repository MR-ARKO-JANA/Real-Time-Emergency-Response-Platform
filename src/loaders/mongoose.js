const mongoose = require('mongoose');
const logger = require('./logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectWithRetry(uri, options, retries, label) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await mongoose.connect(uri, options);
            logger.info(`Connected to ${label} on attempt ${attempt}`);
            return true;
        } catch (err) {
            logger.warn(`${label} connection attempt ${attempt}/${retries} failed: ${err.message}`);
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
            }
        }
    }
    return false;
}

async function cleanIndexes() {
    try {
        const collection = mongoose.connection.collection('users');
        const indexes = await collection.indexes();
        for (const idx of indexes) {
            if (idx.name.includes('firebase') || (idx.name.includes('phone') && idx.unique)) {
                await collection.dropIndex(idx.name).catch(() => {});
                logger.info(`Cleaned up obsolete index: ${idx.name}`);
            }
        }
    } catch (e) {
        // Ignore index cleanup errors if collection doesn't exist yet
    }
}

module.exports = async () => {
    const atlasUri = process.env.MONGO_URI;
    const localUri = 'mongodb://127.0.0.1:27017/nearhelp';

    logger.debug('MONGO_URI configured: ' + !!atlasUri);

    if (atlasUri) {
        logger.info('Attempting to connect to MongoDB Atlas...');
        const connected = await connectWithRetry(atlasUri, {
            serverSelectionTimeoutMS: 10000,
            connectTimeoutMS: 15000,
        }, MAX_RETRIES, 'MongoDB Atlas');

        if (connected) {
            await cleanIndexes();
            return;
        }
        logger.warn('All Atlas retries failed. Falling back to local MongoDB...');
    }

    // Fallback to local MongoDB
    const localConnected = await connectWithRetry(localUri, {
        serverSelectionTimeoutMS: 3000,
    }, 2, 'Local MongoDB');

    if (localConnected) {
        await cleanIndexes();
    } else {
        logger.error('Failed to connect to both Atlas and Local MongoDB.');
        logger.warn('RUNNING IN OFFLINE PROTOTYPE MODE: DB features unavailable.');
    }
};
