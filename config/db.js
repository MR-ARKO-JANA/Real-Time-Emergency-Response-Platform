const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // Fallback to local MongoDB if no URI is provided in .env
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nearhelp';
        await mongoose.connect(uri);
        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('MongoDB Connection Error: Running in offline prototype mode.');
        // Don't exit process, we want the WebSockets to keep running in-memory
    }
};

module.exports = connectDB;
