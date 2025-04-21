const express = require('express');
const router = express.Router();
const {
    createOrder,
    updateOrder,
    deleteOrder,
    getOrders,
    getEmployeeOrders,
    getEmployeePerformance,
    getMonthlyPerformance,
    getAllOrdersMonthlyPerformance,
    getAllEmployeesOrderPerformance,
    getEmployeeMonthlyOrderPerformance,
    getTeamMembersOrderPerformance
} = require('../controllers/orderController');
const { protect, adminOnly, employeeOnly, teamManagerOnly, adminOrTeamManager } = require('../middleware/authMiddleware');

// Create new order
router.post('/', protect, createOrder);

// Get all orders
router.get('/', protect, adminOnly, getOrders);

// Get employee orders
router.get('/employee-orders', protect, getEmployeeOrders);

// Get employee performance
router.get('/employee-performance', protect, getEmployeePerformance);

// Get employee monthly performance
router.get('/employee-performance/monthly', protect, getEmployeeMonthlyOrderPerformance);

// Get monthly performance
router.get('/monthly-performance', protect, adminOnly, getMonthlyPerformance);

// Get all orders monthly performance (Admin only)
router.get('/all-orders-performance/monthly', protect, adminOnly, getAllOrdersMonthlyPerformance);

// Get all employees order performance (Admin only)
router.get('/employees-order-performance', protect, adminOnly, getAllEmployeesOrderPerformance);

// Get team members order performance (Team Manager only)
router.get('/team-members-performance', protect, teamManagerOnly, getTeamMembersOrderPerformance);

// Update order
router.put('/:id', protect, adminOnly, updateOrder);

// Delete order
router.delete('/:id', protect, adminOnly, deleteOrder);

module.exports = router; 