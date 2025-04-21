// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getUserProfile, getEmployees, getTeamManagers, getAllUsers, updateUser, deleteUser } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Registration
router.post('/register', register);

// Login
router.post('/login', login);


router.get('/profile', protect, getUserProfile);

router.get('/employees', protect, adminOnly, getEmployees);

router.get('/team-managers', protect, adminOnly, getTeamManagers);
// Route: GET /api/auth/users (Fetch all users)

router.get('/users', protect, adminOnly, getAllUsers);

// Route: PUT /api/auth/users/:id (Update user)
router.put('/users/:id', protect, adminOnly, updateUser);

// Route: DELETE /api/auth/users/:id (Delete user)
router.delete('/users/:id', protect, adminOnly, deleteUser);

module.exports = router;
