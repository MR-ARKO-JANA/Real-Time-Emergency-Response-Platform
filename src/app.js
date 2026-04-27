const express = require('express');
const loaders = require('./loaders');
const http = require('http');

async function startServer() {
    const app = express();
    const server = http.createServer(app);

    await loaders({ expressApp: app, server });

    return { app, server };
}

module.exports = startServer;
