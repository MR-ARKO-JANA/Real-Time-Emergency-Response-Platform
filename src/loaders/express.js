const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const logger = require('./logger');

// Routes
const authRoutes = require('../api/routes/auth.routes');
const sosRoutes = require('../api/routes/sos.routes');

module.exports = async ({ app }) => {
    // Trust Proxy (required for express-rate-limit on Cloud Run/proxies)
    app.set('trust proxy', 1);

    // Logging
    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

    // Security
    app.use(helmet({
        contentSecurityPolicy: false,
    }));

    // Rate Limiting
    const limiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'Too many requests from this IP, please try again after 15 minutes',
        validate: { trustProxy: false }
    });
    app.use('/api/', limiter);

    // CORS
    const origins = [
        process.env.CLIENT_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ].filter(Boolean);

    const corsOptions = {
        origin: function (origin, callback) {
            if (!origin || origins.indexOf(origin) !== -1 || origin.includes('localhost')) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        optionsSuccessStatus: 200
    };
    app.use(cors(corsOptions));

    // Body Parser
    app.use(express.json());
    
    // Static Files
    app.use(express.static(path.join(process.cwd(), 'public')));

    // Swagger
    const swaggerOptions = {
        definition: {
            openapi: '3.0.0',
            info: {
                title: 'NearHelp API',
                version: '1.0.0',
                description: 'Emergency Response Platform API'
            },
            servers: [
                { url: `http://localhost:${process.env.PORT || 3000}` }
            ]
        },
        apis: ['./src/api/routes/*.js']
    };
    const swaggerDocs = swaggerJsdoc(swaggerOptions);
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

    // API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/sos', sosRoutes);

    // Centralized Error Handling
    app.use((err, req, res, next) => {
        logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
        res.status(err.status || 500).json({
            error: {
                message: err.message || 'Internal Server Error',
            }
        });
    });

    return app;
};
