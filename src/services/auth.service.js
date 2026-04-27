const User = require('../models/user.model');
const mongoose = require('mongoose');
const logger = require('../loaders/logger');

// In-memory fallback for offline prototype mode
const inMemoryUsers = new Map();

class AuthService {
    async syncUser(userData) {
        const { firebaseUid, name, email, phone, role, location } = userData;

        if (mongoose.connection.readyState !== 1) {
            logger.warn(`[Offline Mode] Syncing ${email} to memory.`);
            const memUser = { ...userData, _id: `mem_${Date.now()}` };
            inMemoryUsers.set(firebaseUid, memUser);
            return { status: 201, data: { msg: 'Account Created (In-Memory Support)', user: memUser } };
        }

        let user = await User.findOne({ firebaseUid });
        if (user) {
            return { status: 200, data: { msg: 'User already synced', user } };
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
            phone,
            firebaseUid,
            role: role || 'citizen',
            location: {
                type: 'Point',
                coordinates
            }
        });

        await user.save();
        logger.info('User synced with MongoDB:', email);
        return { status: 201, data: { msg: 'User synced successfully', user } };
    }

    async getProfile(uid) {
        if (mongoose.connection.readyState !== 1) {
            const user = inMemoryUsers.get(uid);
            if (user) return { status: 200, data: user };
            return { status: 404, data: { msg: 'User not found in memory (Offline Mode)' } };
        }

        const user = await User.findOne({ firebaseUid: uid });
        if (!user) {
            return { status: 404, data: { msg: 'User profile not found' } };
        }
        return { status: 200, data: user };
    }

    async updateProfile(uid, updates) {
        if (mongoose.connection.readyState !== 1) {
            let user = inMemoryUsers.get(uid) || { firebaseUid: uid };
            user = { ...user, ...updates };
            inMemoryUsers.set(uid, user);
            return { status: 200, data: user };
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return { status: 404, data: { msg: 'User profile not found' } };
        }
        return { status: 200, data: user };
    }
}

module.exports = new AuthService();
