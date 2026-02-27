const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Fallback to local MongoDB if no URI is provided in .env
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nearhelp';
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
