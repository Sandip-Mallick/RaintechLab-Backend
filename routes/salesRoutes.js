// routes/salesRoutes.js
const express = require('express');
const router = express.Router();
const {
    addSale, getSales, deleteSale, updateSale, getEmployeeSales, getEmployeePerformance,
    getSalesPerformanceByEmployee, getMonthlyPerformance, getMonthlyEmployeePerformance,
    getAllEmployeesMonthlyPerformance, getTeamMembersSalesPerformance
} = require('../controllers/salesController');
const { protect, adminOnly, teamManagerOnly, adminOrTeamManager } = require('../middleware/authMiddleware');

// Add new sale
router.post('/', protect, addSale);

// Get all sales
router.get('/', protect, getSales);

// Get employee sales
router.get('/employee-sales', protect, getEmployeeSales);

// Get employee performance (for current employee)
router.get('/my-performance', protect, getEmployeePerformance);

// Get employee performance
router.get('/employee-performance', protect, getEmployeePerformance);

// Get employee performance by ID
router.get('/employee-performance/:id', protect, adminOnly, getSalesPerformanceByEmployee);

// Get monthly performance
router.get('/monthly-performance', protect, getMonthlyPerformance);

// Get employee monthly performance for the current user 
router.get('/employee-performance/monthly', protect, getMonthlyEmployeePerformance);

// Get all employees monthly performance (Admin only)
router.get('/all-employees-performance/monthly', protect, adminOnly, getAllEmployeesMonthlyPerformance);

// Get team members sales performance (Team Manager only)
router.get('/team-members-performance', protect, teamManagerOnly, getTeamMembersSalesPerformance);

// Update sale
router.put('/:id', protect, updateSale);

// Delete sale
router.delete('/:id', protect, deleteSale);

module.exports = router;
