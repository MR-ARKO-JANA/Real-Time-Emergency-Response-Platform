const jwt = require('jsonwebtoken');
const logger = require('../../loaders/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallbackkey123';

module.exports = async function (req, res, next) {
    // Get token from header (format: Bearer <token>)
    const authHeader = req.header('Authorization');

    // Check if not token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);

        // Attach user info to req object
        req.user = {
            id: decodedToken.id, 
            email: decodedToken.email
        };

        next();
    } catch (err) {
        logger.error('JWT Auth Error:', err);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
