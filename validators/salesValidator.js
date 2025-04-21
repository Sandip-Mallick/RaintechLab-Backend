// validators/salesValidator.js
const { body, validationResult } = require('express-validator');

// Validation Rules
exports.validateSales = [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('clientName').notEmpty().withMessage('Client name is required'),
    body('salesAmount').isFloat({ gt: 0 }).withMessage('Sales amount must be a positive number'),
    body('salesQty').isInt({ gt: 0 }).withMessage('Sales quantity must be a positive integer'),
    body('sourcingCost').isFloat({ gt: 0 }).withMessage('Sourcing cost must be a positive number'),
    body('date').isISO8601().withMessage('Invalid date format'),
    handleValidationErrors
];

// Error Handling Middleware
function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}
