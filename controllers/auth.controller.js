const User = require('../models/user.model');

// In-memory fallback for offline prototype mode
const inMemoryUsers = new Map();

// Sync a user from Firebase to MongoDB
exports.syncUser = async (req, res) => {
    try {
        const { firebaseUid, name, email, phone, role, location } = req.body;
        const mongoose = require('mongoose');

        // Offline Hackathon Prototype Fallback
        if (mongoose.connection.readyState !== 1) {
            console.warn(`[Offline Mode] Syncing ${email} to memory.`);
            const userData = { ...req.body, _id: `mem_${Date.now()}` };
            inMemoryUsers.set(firebaseUid, userData);
            return res.status(201).json({ msg: 'Account Created (In-Memory Support)', user: userData });
        }

        // Check if user already exists in DB
        let user = await User.findOne({ firebaseUid });

        if (user) {
            // User already synced, but we might want to update location or role
            // if login updates are needed, we can do it here. 
            // For now, let's just return success
            return res.status(200).json({ msg: 'User already synced', user });
        }

        // Parse location string "lat,lng" to [lng, lat]
        let coordinates = [0, 0];
        if (location && location.includes(',')) {
            const parts = location.split(',');
            if (parts.length === 2) {
                coordinates = [parseFloat(parts[1]), parseFloat(parts[0])]; // [lng, lat]
            }
        }

        // Create new user profile in MongoDB
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
        console.log('User synced with MongoDB:', email);
        res.status(201).json({ msg: 'User synced successfully', user });
    } catch (err) {
        console.error('Sync Error:', err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

// Get user profile from MongoDB
exports.getProfile = async (req, res) => {
    try {
        const mongoose = require('mongoose');
        const { uid } = req.params;

        if (mongoose.connection.readyState !== 1) {
            const user = inMemoryUsers.get(uid);
            if (user) return res.status(200).json(user);
            return res.status(404).json({ msg: 'User not found in memory (Offline Mode)' });
        }

        const user = await User.findOne({ firebaseUid: uid });

        if (!user) {
            return res.status(404).json({ msg: 'User profile not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Profile Fetch Error for UID:', req.params.uid, err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};

// Update user profile in MongoDB
exports.updateProfile = async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;

        if (require('mongoose').connection.readyState !== 1) {
            let user = inMemoryUsers.get(uid) || { firebaseUid: uid };
            user = { ...user, ...updates };
            inMemoryUsers.set(uid, user);
            return res.status(200).json(user);
        }

        const user = await User.findOneAndUpdate(
            { firebaseUid: uid },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({ msg: 'User profile not found' });
        }

        res.status(200).json(user);
    } catch (err) {
        console.error('Profile Update Error:', err);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
};
