const User = require('../models/user.model');

// Sync a user from Firebase to MongoDB
exports.syncUser = async (req, res) => {
    try {
        const { firebaseUid, name, email, role, location } = req.body;

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
