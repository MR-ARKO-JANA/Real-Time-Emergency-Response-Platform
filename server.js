require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const morgan = require('morgan');
const logger = require('./config/logger');

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const sosRoutes = require('./routes/sos.routes');
const initializeSocket = require('./sockets/sos.socket');

// Initialize App
const app = express();
const server = http.createServer(app);

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Swagger Config
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
    apis: ['./routes/*.js']
};
const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for prototype to avoid blocking assets/sockets
}));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased limit for testing
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

const origins = [
    process.env.CLIENT_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000"
].filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: "*", // Use wildcard for sockets in prototype to ensure connectivity
        methods: ["GET", "POST"]
    }
});

// Middleware
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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Connect Database (MongoDB)
connectDB();

// Define API Routes
app.use('/api/auth', authRoutes);
app.use('/api/sos', sosRoutes);

// Initialize Socket.io Logic
initializeSocket(io);

// Centralized Error Handling
app.use((err, req, res, next) => {
    logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    res.status(err.status || 500).json({
        error: {
            message: err.message || 'Internal Server Error',
        }
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
