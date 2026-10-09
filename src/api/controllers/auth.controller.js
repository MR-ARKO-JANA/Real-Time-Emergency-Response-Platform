const authService = require('../../services/auth.service');
const logger = require('../../loaders/logger');

exports.register = async (req, res) => {
    try {
        const result = await authService.register(req.body);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Register Error:', err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ msg: 'Please provide email and password' });
        const result = await authService.login(email, password);
        return res.status(result.status).json(result.data);
    } catch (err) {
        logger.error('Login Error:', err);
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
