require('dotenv').config();
const startServer = require('./app');
const logger = require('./loaders/logger');

// --- Global Crash Handlers ---
// Catches synchronous errors thrown outside of any try/catch
process.on('uncaughtException', (err) => {
    logger.error('UNCAUGHT EXCEPTION - Shutting down...', { message: err.message, stack: err.stack });
    process.exit(1);
});

// Catches unhandled Promise rejections (async errors)
process.on('unhandledRejection', (reason, promise) => {
    logger.error('UNHANDLED PROMISE REJECTION - Shutting down...', { reason });
    process.exit(1);
});

async function init() {
    try {
        const { server } = await startServer();
        
        const PORT = process.env.PORT || 3000;
        
        server.on('error', (e) => {
            if (e.code === 'EADDRINUSE') {
                logger.error(`Port ${PORT} is already in use. Please stop other instances of the server and try again.`);
                process.exit(1);
            } else {
                logger.error('Server error:', e);
            }
        });

        server.listen(PORT, '0.0.0.0', () => {
            logger.info(`
      ################################################
      🛡️  Server listening on port: ${PORT} (0.0.0.0) 🛡️
      ################################################
    `);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

init();
