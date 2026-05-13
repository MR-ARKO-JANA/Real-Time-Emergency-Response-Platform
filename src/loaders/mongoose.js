const mongoose = require('mongoose');
const logger = require('./logger');

module.exports = async () => {
    const atlasUri = process.env.MONGO_URI;
    const localUri = 'mongodb://127.0.0.1:27017/nearhelp';

    try {
        console.log("Checking MONGO_URI in process.env. Is it set?", !!process.env.MONGO_URI);
        if (atlasUri) {
            logger.info('Attempting to connect to MongoDB Atlas...');
            await mongoose.connect(atlasUri, {
                serverSelectionTimeoutMS: 5000,
            });
            logger.info('Connected to MongoDB Atlas successfully');
            return;
        }
    } catch (error) {
        logger.warn('MongoDB Atlas connection failed. Error details: ' + error.message);
        console.error(error);
        logger.warn('Falling back to local MongoDB...');
    }

    try {
        await mongoose.connect(localUri, {
            serverSelectionTimeoutMS: 2000,
        });
        logger.info('Connected to Local MongoDB successfully');
    } catch (error) {
        logger.error('Failed to connect to both Atlas and Local MongoDB.');
        logger.warn('RUNNING IN OFFLINE PROTOTYPE MODE: Features are fully enabled in memory.');
    }
};
