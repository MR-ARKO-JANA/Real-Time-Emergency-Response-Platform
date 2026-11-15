const authService = require('../../services/auth.service');
const logger = require('../../loaders/logger');
const mongoose = require('mongoose');
const User = require('../../models/user.model');

exports.syncUser = async (req, res) => {
    try {
        const { firebaseUid, name, email, phone, role, location } = req.body;

        if (mongoose.connection.readyState !== 1) {
            return res.status(500).json({ msg: 'Database offline. Cannot sync user.' });
        }

        const existingUser = await User.findOne({
            $or: [{ firebaseUid }, { email }]
        });
        if (existingUser) {
            return res.status(200).json({ msg: 'User already synced.' });
        }

        let coordinates = [0, 0];
        if (location && location.includes(',')) {
            const parts = location.split(',');
            if (parts.length === 2) {
                coordinates = [parseFloat(parts[1]), parseFloat(parts[0])];
            }
        }

        const fallbackPassword = `${firebaseUid}-${Date.now()}`;
        const user = new User({
            firebaseUid,
            name,
            email,
            password: fallbackPassword,
            phone,
            role: role || 'citizen',
            location: {
                type: 'Point',
                coordinates
            }
        });

        await user.save();
        return res.status(201).json({ msg: 'User synced successfully.' });
    } catch (err) {
        logger.error('Sync User Error:', err);
        return res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

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
