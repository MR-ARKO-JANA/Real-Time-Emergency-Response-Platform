const { Server } = require('socket.io');
const initializeSocket = require('../sockets/sos.socket');
const logger = require('./logger');

module.exports = async ({ server }) => {
    const allowedOrigins = [
        process.env.CLIENT_URL,
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ].filter(Boolean);

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST']
        }
    });

    initializeSocket(io);
    logger.info('Socket.io Initialized');

    return io;
};
