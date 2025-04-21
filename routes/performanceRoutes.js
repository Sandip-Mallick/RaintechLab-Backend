// routes/performanceRoutes.js
const express = require('express');
const router = express.Router();
const { getPerformanceReports } = require('../controllers/performanceController');
const { protect, adminOnly, employeeOnly } = require('../middleware/authMiddleware');

// Admin views all performance reports
router.get('/', protect, adminOnly, getPerformanceReports);

// Employee views own performance report
router.get('/my-performance', protect, employeeOnly, getPerformanceReports);

module.exports = router;
