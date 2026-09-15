const admin = require('../../config/firebase-admin');
const logger = require('../../loaders/logger');

module.exports = async function (req, res, next) {
    // Get token from header (format: Bearer <token>)
    const authHeader = req.header('Authorization');

    // Check if not token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(token);

        // Attach firebase user info to req object
        req.user = {
            id: decodedToken.uid, // We will use this to look up our DB matching user
            email: decodedToken.email
        };

        next();
    } catch (err) {
        logger.error('Firebase Auth Error:', err);
        res.status(401).json({ message: 'Token is not valid' });
    }
};
