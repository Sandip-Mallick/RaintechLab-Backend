// controllers/teamController.js
const Team = require('../models/Team');

// Create New Team
exports.createTeam = async (req, res) => {
    try {
        const { teamName, members, targetAmount, teamManager } = req.body;

        const newTeam = await Team.create({ 
            teamName, 
            members, 
            targetAmount, 
            teamManager,
            createdBy: req.user.id 
        });

        res.status(201).json(newTeam);
    } catch (err) {
        console.error('Failed to create team:', err.message);
        res.status(500).json({ msg: 'Failed to create team', error: err.message });
    }
};

// Get All Teams
exports.getTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('members', 'name email permissions') // Include permissions when populating members
            .populate('teamManager', 'name email permissions') // Include team manager details
            .populate('createdBy', 'name email');

        res.status(200).json(teams);
    } catch (err) {
        console.error('Failed to retrieve teams:', err.message);
        res.status(500).json({ msg: 'Failed to retrieve teams', error: err.message });
    }
};

// Update Team
exports.updateTeam = async (req, res) => {
    try {
        const { teamName, members, targetAmount, teamManager } = req.body;
        const updatedTeam = await Team.findByIdAndUpdate(
            req.params.id, 
            { 
                teamName, 
                members,
                targetAmount,
                teamManager 
            }, 
            { new: true }
        );
        if (!updatedTeam) {
            return res.status(404).json({ msg: 'Team not found' });
        }
        res.status(200).json(updatedTeam);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update team', error: err.message });
    }
};

// Delete Team
exports.deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);
        if (!team) {
            return res.status(404).json({ msg: 'Team not found' });
        }
        res.status(200).json({ msg: 'Team deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete team', error: err.message });
    }
};

// Get Team by Manager ID (used for both /manager/:managerId and /my-team routes)
exports.getTeamByManager = async (req, res) => {
    try {
        // Get the manager ID either from the request params or from the logged-in user
        const managerId = req.params.managerId || req.user.id;
        
        console.log(`Finding team for manager ID: ${managerId}`);
        
        // Find team where this user is the team manager
        const team = await Team.findOne({ teamManager: managerId })
            .populate({
                path: 'members',
                select: 'name email permissions role avatar' // Only select necessary fields
            })
            .populate('teamManager', 'name email');
            
        if (!team) {
            console.log(`No team found for manager ID: ${managerId}`);
            return res.status(404).json({ msg: 'No team found for this manager' });
        }
        
        console.log(`Found team "${team.teamName}" with ${team.members.length} members`);
        
        res.status(200).json(team);
    } catch (err) {
        console.error('Error in getTeamByManager:', err.message);
        res.status(500).json({ msg: 'Failed to retrieve team', error: err.message });
    }
};
