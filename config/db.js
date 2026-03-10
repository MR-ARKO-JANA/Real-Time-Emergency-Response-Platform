const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nearhelp';
        console.log('Connecting to MongoDB...');

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        });

        console.log('MongoDB Connected Successfully');
    } catch (error) {
        console.error('--- DATABASE NOTICE ---');
        console.error('MongoDB Atlas Connection Blocked (IP Whitelist).');
        console.error('To sync with Cloud, please add your IP 103.182.107.141 to Atlas Dashboard.');
        console.warn('RUNNING IN OFFLINE PROTOTYPE MODE: Features are fully enabled in memory.');
        console.error('------------------------');
    }
};

module.exports = connectDB;
