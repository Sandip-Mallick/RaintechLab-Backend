// config/db.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');
require('dotenv').config();

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            logger.error('MONGO_URI environment variable is not defined');
            process.exit(1);
        }

        // Extract database name for logging (without connection details)
        const dbName = process.env.MONGO_URI.split('/').pop().split('?')[0];
        
        const conn = await mongoose.connect(process.env.MONGO_URI);

        logger.info(`MongoDB Connected to database: ${dbName || 'unknown'}`);
        
        // Set up connection error handler
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error', err);
        });
        
        // Set up disconnection handler
        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });
        
        return conn;
    } catch (err) {
        logger.error('MongoDB connection failed', err);
        
        // Check for specific error types
        if (err.name === 'MongoServerSelectionError') {
            logger.error('Could not connect to any MongoDB server. Check your connection string and network.');
        }
        
        process.exit(1);
    }
};

module.exports = connectDB;
