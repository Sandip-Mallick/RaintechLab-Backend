// validators/performanceValidator.js
const { body, validationResult } = require('express-validator');

exports.validatePerformance = [
    body('achievementPercentage').isFloat({ min: 0, max: 100 }).withMessage('Achievement percentage must be between 0 and 100'),
    body('achievementForYear').isFloat({ min: 0 }).withMessage('Achievement for year must be a non-negative number'),
    handleValidationErrors
];

function handleValidationErrors(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
}
