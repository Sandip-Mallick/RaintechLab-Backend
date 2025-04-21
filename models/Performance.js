// models/Performance.js
const mongoose = require('mongoose');

const PerformanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
    achievementPercentage: { type: Number, default: 0 },
    achievementForYear: { type: Number, default: 0 },
    month: { type: Number, required: true },
    year: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Performance', PerformanceSchema);
