require('dotenv').config();
const startServer = require('./app');
const logger = require('./loaders/logger');

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

        server.listen(PORT, () => {
            logger.info(`
      ################################################
      🛡️  Server listening on port: ${PORT} 🛡️
      ################################################
    `);
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

init();
