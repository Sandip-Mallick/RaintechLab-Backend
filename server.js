// @ts-nocheck
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const clientRoutes = require('./routes/clientRoutes');
const logger = require('./utils/logger');
const mongoose = require('mongoose');

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cors());

// Log middleware to capture and sanitize requests
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.originalUrl}`, {
        query: req.query,
        // Don't log body for auth routes to avoid logging credentials
        ...(!/\/auth\/(login|register)/.test(req.originalUrl) && { body: req.body })
    });
    next();
});

// Root route - welcome message
app.get('/', (req, res) => {
    // Check if connected to database
    const isHealthy = mongoose.connection.readyState === 1;
    
    if (isHealthy) {
        res.status(200).send('Server health: GOOD -Server is running properly');
    } else {
        res.status(500).send('Server health: ERROR - Database connection issue');
    }
});

// API Routes
app.use('/api/clients', clientRoutes);
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/targets', require('./routes/targetRoutes'));
app.use('/api/teams', require('./routes/teamRoutes'));
app.use('/api/performance', require('./routes/performanceRoutes'));

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Server error', err);
    res.status(500).json({ msg: 'Server error', error: 'An unexpected error occurred' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
