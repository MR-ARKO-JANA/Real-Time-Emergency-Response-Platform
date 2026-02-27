const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');

// Register a new user
exports.register = async (req, res) => {
    try {
        const { name, email, password, role, location } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Parse location string "lat,lng" to [lng, lat]
        let coordinates = [0, 0];
        if (location && location.includes(',')) {
            const parts = location.split(',');
            coordinates = [parseFloat(parts[1]), parseFloat(parts[0])]; // [lng, lat]
        }

        user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'citizen',
            location: {
                type: 'Point',
                coordinates
            }
        });

        await user.save();
        console.log('User registered successfully:', email);
        res.status(201).json({ msg: 'User registered successfully' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ msg: err.message || 'Server Error' });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // JWT Payload
        const payload = {
            user: {
                id: user.id
            }
        };

        const secret = process.env.JWT_SECRET || 'secret123';

        jwt.sign(payload, secret, { expiresIn: '5h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
