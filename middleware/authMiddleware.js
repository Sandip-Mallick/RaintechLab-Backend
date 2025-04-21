// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
require('dotenv').config();

// Middleware to verify JWT token and extract user role
exports.protect = (req, res, next) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        logger.warn('Authentication failed: No Bearer token');
        return res.status(401).json({ 
            msg: 'No token, authorization denied',
            details: 'Authentication token is missing or invalid'
        });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
        logger.warn('Authentication failed: Empty token');
        return res.status(401).json({ 
            msg: 'No token, authorization denied',
            details: 'Authentication token is empty'
        });
    }

    try {
        // Verify token with secret
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if decoded contains the required fields
        if (!decoded.id || !decoded.role) {
            logger.warn('Authentication failed: Token missing required fields');
            return res.status(401).json({ 
                msg: 'Invalid token',
                details: 'Token is missing required user information'
            });
        }
        
        // Set user info in request for use in route handlers
        req.user = decoded;
        next();
    } catch (err) {
        logger.error('JWT verification error:', err);
        
        // Specific error for expired tokens
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                msg: 'Token expired',
                details: 'Your session has expired. Please log in again.'
            });
        }
        
        // Handle other JWT errors
        res.status(401).json({ 
            msg: 'Token is not valid',
            details: 'Authentication failed. Please log in again.'
        });
    }
};

// Middleware to restrict access to Admin only
exports.adminOnly = (req, res, next) => {
    if (req.user.role !== 'Admin') {
        logger.warn(`Access denied: User with role ${req.user.role} attempted to access admin-only route`);
        return res.status(403).json({ 
            msg: 'Access denied: Admins only',
            details: 'You do not have permission to access this resource'
        });
    }
    next();
};

// Middleware to restrict access to Employees only
exports.employeeOnly = (req, res, next) => {
    if (req.user.role !== 'Employee') {
        logger.warn(`Access denied: User with role ${req.user.role} attempted to access employee-only route`);
        return res.status(403).json({ 
            msg: 'Access denied: Employees only',
            details: 'You do not have permission to access this resource'
        });
    }
    next();
};

// Middleware to restrict access to Team Managers only
exports.teamManagerOnly = (req, res, next) => {
    if (req.user.role !== 'Team Manager') {
        logger.warn(`Access denied: User with role ${req.user.role} attempted to access team-manager-only route`);
        return res.status(403).json({ 
            msg: 'Access denied: Team Managers only',
            details: 'You do not have permission to access this resource'
        });
    }
    next();
};

// Middleware to allow access to both Admin and Team Manager roles
exports.adminOrTeamManager = (req, res, next) => {
    if (req.user.role !== 'Admin' && req.user.role !== 'Team Manager') {
        logger.warn(`Access denied: User with role ${req.user.role} attempted to access admin/team-manager route`);
        return res.status(403).json({ 
            msg: 'Access denied: Admin or Team Manager only',
            details: 'You do not have permission to access this resource'
        });
    }
    next();
};
