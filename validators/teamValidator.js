// validators/teamValidator.js
const { body, validationResult } = require('express-validator');

// Team Validation Middleware
exports.validateTeam = [
    body('teamName').notEmpty().withMessage('Team name is required'),
    body('members').notEmpty().withMessage('Team members are required'),
    body('targetAmount').isNumeric().withMessage('Target amount must be a number'),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    }
];
