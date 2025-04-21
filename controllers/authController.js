// controllers/authController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// User Registration
exports.register = async (req, res) => {
    const { name, email, password, role, permissions } = req.body;
    
    try {
        // Check if user exists - case insensitive email check
        const existingUser = await User.findOne({ 
            email: { $regex: new RegExp(`^${email}$`, 'i') }
        });
        
        if (existingUser) {
            console.log('User already exists with email:', email);
            return res.status(400).json({ 
                msg: 'User already exists',
                details: 'An account with this email address already exists'
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user - with more detailed error handling
        try {
            const user = await User.create({ 
                name, 
                email: email.toLowerCase(), // Ensure email is stored in lowercase
                password: hashedPassword, 
                role: role || 'Employee', // Ensure role has a default
                permissions: permissions || 'Sales & Orders' // Default permissions
            });
            
            console.log(`User registered successfully with ID: ${user._id}`);
            res.status(201).json({ 
                msg: 'User registered successfully', 
                user: { 
                    id: user._id, 
                    name: user.name, 
                    role: user.role,
                    permissions: user.permissions,
                    email: user.email 
                } 
            });
        } catch (dbError) {
            console.error('MongoDB Error during user creation:', dbError);
            
            // Check for validation errors
            if (dbError.name === 'ValidationError') {
                return res.status(400).json({ 
                    msg: 'Validation failed', 
                    errors: Object.values(dbError.errors).map(e => e.message) 
                });
            }
            
            // Check for duplicate key error
            if (dbError.code === 11000) {
                return res.status(400).json({ 
                    msg: 'Email is already in use',
                    details: 'An account with this email address already exists'
                });
            }
            
            // Generic database error
            return res.status(500).json({ 
                msg: 'Database error', 
                error: dbError.message 
            });
        }
    } catch (err) {
        console.error('Server error during registration:', err);
        res.status(500).json({ 
            msg: 'Server error', 
            error: err.message 
        });
    }
};

// User Login
exports.login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ 
                msg: 'Email is not registered in the CRM', 
                details: 'Please ask your admin to register yourself or recheck your email id'
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ 
                msg: 'Password is Invalid', 
                details: 'The password you entered is incorrect. Please try again.'
            });
        }
        
        // Use longer token expiration time for better user experience
        const token = jwt.sign(
            { 
                id: user._id, 
                role: user.role,
                permissions: user.permissions,
                name: user.name
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' } // Increased from 1h to 24h
        );
        
        // Don't return password with user object
        const userWithoutPassword = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions,
            profilePic: user.profilePic,
            teamId: user.teamId
        };
        
        res.json({ token, user: userWithoutPassword });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ 
            msg: 'Server error during login', 
            details: 'An unexpected error occurred. Please try again later.'
        });
    }
};

exports.getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch user profile' });
    }
};
exports.getEmployees = async (req, res) => {
    try {
        const employees = await User.find({ 
            $or: [
                { role: 'Employee' },
                { role: 'Team Manager' }
            ]
        }).select('name email permissions role');
        res.status(200).json(employees);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch employees', error: err.message });
    }
};
exports.getTeamManagers = async (req, res) => {
    try {
        const teamManagers = await User.find({ role: 'Team Manager' }).select('name email permissions');
        res.status(200).json(teamManagers);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to fetch team managers', error: err.message });
    }
};
exports.deleteUser = async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await user.deleteOne();
        res.status(200).json({ msg: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ msg: 'Failed to delete user', error: err.message });
    }
};
exports.updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, permissions, password } = req.body;

    try {
        let user = await User.findById(id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Check if email is being changed and if it's already in use
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ 
                email: { $regex: new RegExp(`^${email}$`, 'i') },
                _id: { $ne: id } // Exclude current user
            });
            
            if (existingUser) {
                return res.status(400).json({ 
                    msg: 'Email already in use',
                    details: 'This email address is already registered to another user'
                });
            }
        }

        // Update user fields
        user.name = name || user.name;
        user.email = email ? email.toLowerCase() : user.email;
        user.role = role || user.role;
        user.permissions = permissions || user.permissions;

        // Handle password update if provided
        if (password) {
            // Hash the new password
            const hashedPassword = await bcrypt.hash(password, 10);
            user.password = hashedPassword;
        }

        try {
            await user.save();
            res.status(200).json({ msg: 'User updated successfully', user });
        } catch (validationError) {
            // Handle validation errors
            if (validationError.name === 'ValidationError') {
                const validationErrors = {};
                
                Object.keys(validationError.errors).forEach(field => {
                    validationErrors[field] = validationError.errors[field].message;
                });
                
                return res.status(400).json({ 
                    msg: 'Validation failed', 
                    details: 'Please check the form for errors',
                    errors: validationErrors
                });
            }
            
            throw validationError; // Re-throw if it's not a validation error
        }
    } catch (err) {
        console.error('Error updating user:', err);
        res.status(500).json({ 
            msg: 'Failed to update user', 
            details: 'An unexpected error occurred while updating the user',
            error: err.message 
        });
    }
};
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude password from response
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json({ msg: 'Failed to retrieve users', error: err.message });
    }
};
