const { Server } = require('socket.io');
const initializeSocket = require('../sockets/sos.socket');
const logger = require('./logger');

module.exports = async ({ server }) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    initializeSocket(io);
    logger.info('Socket.io Initialized');

    return io;
};
