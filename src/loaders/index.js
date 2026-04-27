const expressLoader = require('./express');
const mongooseLoader = require('./mongoose');
const socketLoader = require('./socket');
const logger = require('./logger');

module.exports = async ({ expressApp, server }) => {
    await mongooseLoader();
    logger.info('DB loaded and connected');

    await expressLoader({ app: expressApp });
    logger.info('Express loaded');

    await socketLoader({ server });
    logger.info('Socket loaded');
};
