// controllers/targetController.js
const Target = require('../models/Target');
const User = require('../models/User');
const Team = require('../models/Team');

exports.addTarget = async (req, res) => {
    try {
        const { 
            assignedTo, 
            assignedToModel, 
            targetType, 
            targetAmount, 
            targetQty, 
            month, 
            year, 
            divideAmongMembers,
            createdFor // This may be present when we're creating targets for specific team members
        } = req.body;

        console.log(`Processing target creation: ${targetType} target for ${assignedToModel} ${assignedTo}`);
        console.log(`Target details: Amount: ${targetAmount}, Qty: ${targetQty}, Month: ${month}, Year: ${year}`);

        // Check if assignedTo is a valid user or team ID
        const isUser = assignedToModel === 'User' ? await User.findById(assignedTo) : null;
        const isTeam = assignedToModel === 'Team' ? await Team.findById(assignedTo).populate('members') : null;

        if (!isUser && !isTeam) {
            console.error(`Invalid assignedTo ID (${assignedTo}) or model type (${assignedToModel})`);
            return res.status(400).json({ msg: 'Invalid assignedTo ID or model type' });
        }

        let targetsToCreate = [];
        let totalEligibleMembers = 0;
        let allEligibleUsers = [];

        if (isUser) {
            // Check if user has appropriate permissions for the target type
            const hasPermission = 
                (targetType === 'sales' && (isUser.permissions === 'Sales' || isUser.permissions === 'Sales & Orders' || isUser.permissions === 'All Permissions')) ||
                (targetType === 'order' && (isUser.permissions === 'Orders' || isUser.permissions === 'Sales & Orders' || isUser.permissions === 'All Permissions'));
            
            console.log(`User ${isUser.name} has permission for ${targetType} target: ${hasPermission}`);
            
            if (!hasPermission) {
                return res.status(400).json({ 
                    msg: `User does not have ${targetType === 'sales' ? 'Sales' : 'Orders'} permission required for this target type` 
                });
            }
            
            // Add to eligible users for target distribution
            allEligibleUsers.push(isUser);
        } else if (isTeam) {
            // Check if team has members
            if (!isTeam.members || isTeam.members.length === 0) {
                console.error(`Team ${isTeam.teamName} has no members`);
                return res.status(400).json({ msg: 'Cannot assign target to an empty team' });
            }
            
            console.log(`Team ${isTeam.teamName} has ${isTeam.members.length} members`);
            
            // Filter team members based on permissions
            const eligibleMembers = isTeam.members.filter(member => {
                const hasPermission = targetType === 'sales' 
                    ? (member.permissions === 'Sales' || member.permissions === 'Sales & Orders' || member.permissions === 'All Permissions')
                    : (member.permissions === 'Orders' || member.permissions === 'Sales & Orders' || member.permissions === 'All Permissions');
                    
                console.log(`Team member ${member.name} has permission: ${hasPermission}`);
                return hasPermission;
            });
            
            // Check if any team members have the required permission
            if (eligibleMembers.length === 0) {
                console.error(`No members in team ${isTeam.teamName} have ${targetType} permission`);
                return res.status(400).json({ 
                    msg: `No members in this team have the required ${targetType === 'sales' ? 'Sales' : 'Orders'} permission` 
                });
            }
            
            console.log(`Team ${isTeam.teamName} has ${eligibleMembers.length} eligible members`);
            
            // Add eligible team members to our array for target distribution
            allEligibleUsers = allEligibleUsers.concat(eligibleMembers);
        }

        // If we have a specific createdFor value and it's in our eligible users, only create targets for that user
        if (createdFor) {
            const specificUser = allEligibleUsers.find(user => user._id.toString() === createdFor.toString());
            if (specificUser) {
                console.log(`Creating target specifically for: ${specificUser.name} (${specificUser._id})`);
                allEligibleUsers = [specificUser];
            }
        }

        // If divideAmongMembers is true, we'll divide the amount among team members
        if (divideAmongMembers) {
            totalEligibleMembers = allEligibleUsers.length;
            
            console.log(`Dividing target among ${totalEligibleMembers} eligible members`);
            
            // Calculate the individual target amounts
            const individualTargetAmount = parseFloat((targetAmount / totalEligibleMembers).toFixed(2));
            
            console.log(`Original amount: ${targetAmount}, Individual amount: ${individualTargetAmount}`);
            
            // Create target for each eligible user with divided amount but FULL quantity
            targetsToCreate = allEligibleUsers.map(user => ({
                assignedTo: user._id,
                assignedToModel: 'User', // Always save as individual user targets
                targetType,
                targetAmount: individualTargetAmount,
                targetQty: targetQty, // Same quantity for everyone
                month,
                year,
                originalTotal: targetAmount, // Store the original total for reference
                membersCount: totalEligibleMembers, // Store the number of members this was divided among
                createdBy: req.body.createdBy || req.user?.id,
                createdFor: user._id // Each target is specifically for this user
            }));
        } else {
            // Standard target assignment without division
            if (isUser) {
                targetsToCreate.push({
                    assignedTo: isUser._id,
                    assignedToModel: 'User',
                    targetType,
                    targetAmount,
                    targetQty,
                    month,
                    year,
                    createdBy: req.body.createdBy || req.user?.id,
                    createdFor: isUser._id
                });
            } else if (isTeam) {
                // If a team is assigned, create one target per eligible member with full amount
                targetsToCreate = allEligibleUsers.map(member => ({
                    assignedTo: member._id,
                    assignedToModel: 'User',
                    targetType,
                    targetAmount,
                    targetQty,
                    month,
                    year,
                    createdBy: req.body.createdBy || req.user?.id,
                    createdFor: member._id
                }));
            }
        }

        console.log(`Creating ${targetsToCreate.length} targets`);
        
        const newTargets = await Target.insertMany(targetsToCreate);
        console.log(`Successfully created ${newTargets.length} targets`);
        
        res.status(201).json(newTargets);
    } catch (err) {
        console.error('Error in addTarget:', err);
        res.status(500).json({ msg: 'Failed to create target', error: err.message });
    }
};

exports.getTargets = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let filter = {};
        
        console.log("Target filter parameters:", { startMonth, startYear, endMonth, endYear, month, year });
        
        // Apply date range filter if provided
        if (startMonth && startYear && endMonth && endYear) {
            filter = {
                $or: []
            };
            
            // Add a condition for each month in the range
            for (let y = parseInt(startYear); y <= parseInt(endYear); y++) {
                const startM = y === parseInt(startYear) ? parseInt(startMonth) : 1;
                const endM = y === parseInt(endYear) ? parseInt(endMonth) : 12;
                
                for (let m = startM; m <= endM; m++) {
                    filter.$or.push({
                        month: m,
                        year: y
                    });
                }
            }
            
            console.log(`Filtering targets from ${startMonth}/${startYear} to ${endMonth}/${endYear}`);
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            filter = {
                month: parseInt(month),
                year: parseInt(year)
            };
            console.log(`Filtering targets for specific month: ${month}/${year}`);
        } else {
            console.log("No date filters applied, returning all targets");
        }
        
        const targets = await Target.find(filter)
            .populate({
                path: 'assignedTo',
                select: 'name email teamName',
                model: 'User'
            })
            .populate({
                path: 'createdBy',
                select: 'name email',
                model: 'User'
            });

        // Format the response to include target type
        const formattedTargets = targets.map(target => ({
            ...target.toObject(),
            targetType: target.targetType || 'sales' // Ensure targetType is always set
        }));

        res.status(200).json(formattedTargets);
    } catch (err) {
        console.error('Error in getTargets:', err);
        res.status(500).json({ msg: 'Failed to retrieve targets', error: err.message });
    }
};

exports.getEmployeeTargets = async (req, res) => {
    try {
        const employeeId = req.user.id; // Get logged-in employee ID

        // Check if user exists and get their team IDs
        const user = await User.findById(employeeId).select('name email teamId permissions');
        if (!user) {
            return res.status(404).json({ msg: 'Employee not found' });
        }

        console.log(`Fetching targets for employee: ${user.name} (${employeeId}) with permissions: ${user.permissions}`);

        // First, find all teams this user belongs to
        const teams = await Team.find({ members: { $in: [employeeId] } });
        const teamIds = teams.map(team => team._id);
        
        console.log(`Employee belongs to ${teams.length} teams:`, teamIds);

        // Find targets directly assigned to this user
        const directTargets = await Target.find({ 
            assignedTo: employeeId,
            assignedToModel: 'User'
        }).populate({
            path: 'assignedTo',
            select: 'name email permissions', 
            model: 'User'
        });
        
        console.log(`Found ${directTargets.length} direct targets for employee ${user.name}`);
        
        // Find targets created through team assignments that include this user
        const teamAssignmentTargets = await Target.find({
            createdFor: employeeId
        }).populate({
            path: 'assignedTo',
            select: 'name email permissions',
            model: 'User'
        });
        
        console.log(`Found ${teamAssignmentTargets.length} team-based targets for employee ${user.name}`);
        
        // Combine all targets
        const allTargets = [...directTargets, ...teamAssignmentTargets];
        
        // Use a Set to track processed target IDs to prevent duplicates
        const processedTargetIds = new Set();
        
        // Format the response to include target type and handle any null values
        // Also deduplicate targets in case of multiple permissions
        const formattedTargets = allTargets
            .filter(target => {
                // Create a unique ID for this target
                const targetId = target._id.toString();
                
                // If we've already processed this target, skip it
                if (processedTargetIds.has(targetId)) {
                    console.log(`Skipping duplicate target: ${targetId}`);
                    return false;
                }
                
                // Otherwise, mark it as processed and keep it
                processedTargetIds.add(targetId);
                return true;
            })
            .map(target => ({
                ...target.toObject(),
                targetType: target.targetType || 'sales', // Ensure targetType is always set
                assignedToModel: target.assignedToModel || 'User', // Ensure model is set
                // Make sure we have an assignedTo value even if population failed
                assignedTo: target.assignedTo?._id || target.assignedTo || employeeId
            }));

        console.log(`Returning ${formattedTargets.length} total targets for employee ${user.name}`);
        res.status(200).json(formattedTargets);
    } catch (err) {
        console.error('Error in getEmployeeTargets:', err);
        res.status(500).json({ msg: 'Failed to retrieve employee targets', error: err.message });
    }
};

// Update Target
exports.updateTarget = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedTarget = await Target.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json(updatedTarget);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to update target', error: err.message });
    }
};

// Delete Target
exports.deleteTarget = async (req, res) => {
    try {
        const { id } = req.params;
        await Target.findByIdAndDelete(id);
        res.status(200).json({ msg: 'Target deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete target', error: err.message });
    }
};

// Get targets for a team manager's team members
exports.getTeamMembersTargets = async (req, res) => {
    try {
        // Extract filter parameters from query
        const { startMonth, startYear, endMonth, endYear, month, year } = req.query;
        
        let filter = {};
        
        // Apply date range filter if provided
        if (startMonth && startYear && endMonth && endYear) {
            filter = {
                $or: []
            };
            
            // Add a condition for each month in the range
            for (let y = parseInt(startYear); y <= parseInt(endYear); y++) {
                const startM = y === parseInt(startYear) ? parseInt(startMonth) : 1;
                const endM = y === parseInt(endYear) ? parseInt(endMonth) : 12;
                
                for (let m = startM; m <= endM; m++) {
                    filter.$or.push({
                        month: m,
                        year: y
                    });
                }
            }
        } 
        // Apply specific month/year filter if provided
        else if (month && year) {
            filter = {
                month: parseInt(month),
                year: parseInt(year)
            };
        }
        
        // Get the team manager's ID from the request
        const teamManagerId = req.user.id;
        
        // Find teams managed by this team manager
        const managedTeams = await Team.find({ teamManager: teamManagerId }).select('_id members');
        
        if (!managedTeams || managedTeams.length === 0) {
            return res.status(200).json([]);
        }
        
        // Extract all team member IDs
        const teamMemberIds = [];
        managedTeams.forEach(team => {
            if (team.members && team.members.length > 0) {
                teamMemberIds.push(...team.members);
            }
        });
        
        // Remove duplicates
        const uniqueTeamMemberIds = [...new Set(teamMemberIds.map(id => id.toString()))];
        
        console.log(`Team Manager ${teamManagerId} manages ${managedTeams.length} teams with ${uniqueTeamMemberIds.length} unique members`);
        
        if (uniqueTeamMemberIds.length === 0) {
            return res.status(200).json([]);
        }
        
        // Find targets for team members
        const teamMemberTargets = await Target.find({
            ...filter,
            assignedToModel: 'User',
            assignedTo: { $in: uniqueTeamMemberIds }
        }).populate({
            path: 'assignedTo',
            select: 'name email permissions',
            model: 'User'
        });
        
        console.log(`Found ${teamMemberTargets.length} targets for team members`);
        
        // Use a Set to track processed target IDs to prevent duplicates
        const processedTargetIds = new Set();
        
        // Format the response to include target type and handle any null values
        const formattedTargets = teamMemberTargets
            .filter(target => {
                // Create a unique ID for this target
                const targetId = target._id.toString();
                
                // If we've already processed this target, skip it
                if (processedTargetIds.has(targetId)) {
                    console.log(`Skipping duplicate target: ${targetId}`);
                    return false;
                }
                
                // Otherwise, mark it as processed and keep it
                processedTargetIds.add(targetId);
                return true;
            })
            .map(target => ({
                ...target.toObject(),
                targetType: target.targetType || 'sales', // Ensure targetType is always set
                assignedToModel: target.assignedToModel || 'User' // Ensure model is set
            }));
        
        res.status(200).json(formattedTargets);
    } catch (err) {
        console.error('Error in getTeamMembersTargets:', err);
        res.status(500).json({ msg: 'Failed to retrieve team members targets', error: err.message });
    }
};
