const Performance = require('../models/Performance');

/**
 * @desc    Get all performance reports
 * @route   GET /api/performance
 * @access  Public (or specify access level)
 */
exports.getPerformanceReports = async (req, res) => {
    try {
        const performanceReports = await Performance.find()
            .populate('employeeId', 'name email')
            .populate('teamId', 'teamName');

        if (!performanceReports || performanceReports.length === 0) {
            return res.status(404).json({
                message: 'No performance reports found',
                data: [],
            });
        }

        res.status(200).json({
            message: 'Performance reports retrieved successfully',
            data: performanceReports,
        });
    } catch (error) {
        console.error('Error fetching performance reports:', error.message);
        res.status(500).json({
            message: 'An error occurred while retrieving performance reports',
            error: error.message,
        });
    }
};
