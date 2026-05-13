const authService = require('../../services/auth.service');
const logger = require('../../loaders/logger');

exports.syncUser = async (req, res) => {
    try {
        const result = await authService.syncUser(req.body);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Sync Error:', err);
        // Handle MongoDB duplicate key errors
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern || {})[0] || 'field';
            return res.status(409).json({ msg: `An account with this ${field} already exists. Please sign in instead.` });
        }
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const result = await authService.getProfile(req.params.uid);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Profile Fetch Error for UID:', req.params.uid, err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const result = await authService.updateProfile(req.params.uid, req.body);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Profile Update Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};
