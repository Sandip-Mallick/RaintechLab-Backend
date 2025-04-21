// validators/targetValidator.js
const { body, validationResult } = require('express-validator');

exports.validateTarget = [
    body('targetAmount').isFloat({ gt: 0 }).withMessage('Target amount must be a positive number'),
    body('targetQty').isInt({ gt: 0 }).withMessage('Target quantity must be a positive integer'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
    body('year').isInt({ min: 2000 }).withMessage('Year must be a valid year'),
    handleValidationErrors
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}
