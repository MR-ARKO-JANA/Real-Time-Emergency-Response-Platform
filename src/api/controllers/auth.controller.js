const authService = require('../../services/auth.service');
const logger = require('../../loaders/logger');

exports.syncUser = async (req, res) => {
    try {
        const result = await authService.syncUser(req.body);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Sync Error:', err);
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
