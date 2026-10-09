const User = require('../models/user.model');
const mongoose = require('mongoose');
const logger = require('../loaders/logger');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretfallbackkey123';

class AuthService {
    async register(userData) {
        const { name, email, password, phone, role, location } = userData;

        if (mongoose.connection.readyState !== 1) {
            return { status: 500, data: { msg: 'Database offline. Cannot register.' } };
        }

        let user = await User.findOne({ email });
        if (user) {
            return { status: 409, data: { msg: 'User with this email already exists.' } };
        }

        let coordinates = [0, 0];
        if (location && location.includes(',')) {
            const parts = location.split(',');
            if (parts.length === 2) {
                coordinates = [parseFloat(parts[1]), parseFloat(parts[0])]; // [lng, lat]
            }
        }

        user = new User({
            name,
            email,
            password, // Hashed automatically by pre-save hook
            phone,
            role: role || 'citizen',
            location: {
                type: 'Point',
                coordinates
            }
        });

        try {
            await user.save();
            const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            logger.info('User registered with MongoDB:', email);
            return { status: 201, data: { msg: 'User registered successfully', token, user: { _id: user._id, name, email, role } } };
        } catch (saveErr) {
            throw saveErr;
        }
    }

    async login(email, password) {
        if (mongoose.connection.readyState !== 1) {
            return { status: 500, data: { msg: 'Database offline. Cannot login.' } };
        }

        const user = await User.findOne({ email });
        if (!user) {
            return { status: 401, data: { msg: 'Invalid credentials' } };
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return { status: 401, data: { msg: 'Invalid credentials' } };
        }

        const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        return { status: 200, data: { msg: 'Login successful', token, user: { _id: user._id, name: user.name, email: user.email, role: user.role } } };
    }

    async getProfile(uid) {
        if (mongoose.connection.readyState !== 1) {
            return { status: 500, data: { msg: 'Database offline' } };
        }

        const user = await User.findById(uid).select('-password');
        if (!user) {
            return { status: 404, data: { msg: 'User profile not found' } };
        }
        return { status: 200, data: user };
    }

    async updateProfile(uid, updates) {
        if (mongoose.connection.readyState !== 1) {
            return { status: 500, data: { msg: 'Database offline' } };
        }

        if (updates.password) {
             delete updates.password; // Do not update password here
        }

        const user = await User.findByIdAndUpdate(
            uid,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return { status: 404, data: { msg: 'User profile not found' } };
        }
        return { status: 200, data: user };
    }
}

module.exports = new AuthService();
