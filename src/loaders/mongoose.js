const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = async () => {
    const atlasUri = process.env.MONGO_URI;
    const localUri = 'mongodb://127.0.0.1:27017/nearhelp';

    try {
        logger.debug('MONGO_URI configured: ' + !!process.env.MONGO_URI);
        if (atlasUri) {
            logger.info('Attempting to connect to MongoDB Atlas...');
            await mongoose.connect(atlasUri, {
                serverSelectionTimeoutMS: 5000,
            });
            logger.info('Connected to MongoDB Atlas successfully');
            await cleanIndexes();
            return;
        }
    } catch (error) {
        logger.warn('MongoDB Atlas connection failed. Error details: ' + error.message);
        logger.error('MongoDB Atlas connection error details:', { message: error.message });
        logger.warn('Falling back to local MongoDB...');
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

    try {
        await mongoose.connect(localUri, {
            serverSelectionTimeoutMS: 2000,
        });
        logger.info('Connected to Local MongoDB successfully');
        await cleanIndexes();
    } catch (error) {
        logger.error('Failed to connect to both Atlas and Local MongoDB.');
        logger.warn('RUNNING IN OFFLINE PROTOTYPE MODE: Features are fully enabled in memory.');
    }
};
