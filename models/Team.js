// models/Team.js
const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
    teamName: { type: String, required: true, unique: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    targetAmount: { type: Number, default: 0 },
    teamManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);
