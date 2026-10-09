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
            startKeepAlive();
        });
    } catch (err) {
        logger.error('Failed to start server:', err);
        process.exit(1);
    }
}

function startKeepAlive() {
    const https = require('https');
    const http = require('http');
    const url = process.env.RENDER_EXTERNAL_URL || process.env.SERVER_URL || process.env.PING_URL;

    if (!url) {
        logger.info('ℹ️ Keep-alive: Set RENDER_EXTERNAL_URL or SERVER_URL in environment if self-ping is required.');
        return;
    }

    const pingUrl = url.endsWith('/ping') || url.endsWith('/health') ? url : `${url.replace(/\/$/, '')}/ping`;
    logger.info(`🔁 Starting keep-alive background ping task for: ${pingUrl} (every 10 min)`);

    const interval = 10 * 60 * 1000; // 10 minutes

    // Initial ping after 1 minute
    setTimeout(doPing, 60 * 1000);
    // Recurring ping every 10 minutes
    setInterval(doPing, interval);

    function doPing() {
        const client = pingUrl.startsWith('https') ? https : http;
        client.get(pingUrl, (res) => {
            logger.info(`[Keep-Alive] Ping response: ${res.statusCode}`);
        }).on('error', (err) => {
            logger.error(`[Keep-Alive] Ping error:`, err.message);
        });
    }
}

init();
