// routes/teamRoutes.js
const express = require('express');
const router = express.Router();
const { 
    createTeam, 
    getTeams, 
    updateTeam, 
    deleteTeam,
    getTeamByManager 
} = require('../controllers/teamController');
const { validateTeam } = require('../validators/teamValidator');
const { protect, adminOnly, teamManagerOnly } = require('../middleware/authMiddleware');

// Admin creates a team
router.post('/', protect, adminOnly, validateTeam, createTeam);

// Admin views all teams
router.get('/', protect, adminOnly, getTeams);

// Get team by team manager ID
router.get('/manager/:managerId', protect, getTeamByManager);

// Team manager views their own team
router.get('/my-team', protect, teamManagerOnly, getTeamByManager);

// Admin updates a team
router.put('/:id', protect, adminOnly, validateTeam, updateTeam);

// Admin deletes a team
router.delete('/:id', protect, adminOnly, deleteTeam);

module.exports = router;
