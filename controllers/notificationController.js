// controllers/notificationController.js
// Mock Notifications (You can connect with DB if needed)
exports.getNotifications = async (req, res) => {
    const notifications = [
        { id: 1, message: 'New sales target assigned!', type: 'info' },
        { id: 2, message: 'Payment reminder for Client X', type: 'warning' },
        { id: 3, message: 'Performance report available', type: 'success' }
    ];
    res.json(notifications);
};
