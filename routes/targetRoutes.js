// routes/targetRoutes.js
const express = require('express');
const router = express.Router();
const { addTarget, getTargets, updateTarget, deleteTarget, getEmployeeTargets, getTeamMembersTargets } = require('../controllers/targetController');
const { validateTarget } = require('../validators/targetValidator');
const { protect, adminOnly, employeeOnly, teamManagerOnly, adminOrTeamManager } = require('../middleware/authMiddleware');

// Admin creates a sales target
router.post('/', protect, adminOnly, validateTarget, addTarget);

// Admin views all targets
router.get('/', protect, adminOnly, getTargets);

// Employee views assigned targets
router.get('/my-targets', protect, employeeOnly, getEmployeeTargets);

// Team manager views targets for their team members
router.get('/team-members', protect, teamManagerOnly, getTeamMembersTargets);

// Admin updates a sales target
router.put('/:id', protect, adminOnly, validateTarget, updateTarget);

// Individual employee updates their own target
router.put('/my-targets/:id', protect, employeeOnly, updateTarget);

// Team member target updates (from team management page)
router.put('/team-members/:id', protect, adminOnly, updateTarget);
router.delete('/team-members/:id', protect, adminOnly, deleteTarget);

// Admin deletes a sales target
router.delete('/:id', protect, adminOnly, deleteTarget);

module.exports = router;
