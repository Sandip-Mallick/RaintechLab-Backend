// models/Target.js
const mongoose = require('mongoose');

const TargetSchema = new mongoose.Schema({
    assignedTo: { type: mongoose.Schema.Types.ObjectId, refPath: 'assignedToModel', required: true },
    assignedToModel: { type: String, enum: ['User', 'Team'], required: true },
    targetType: { type: String, enum: ['sales', 'order'], required: true },
    targetAmount: { type: Number, required: true },
    targetQty: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    originalTotal: { type: Number }, // Original total amount before division
    membersCount: { type: Number }, // Number of members this target was divided among
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdFor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // To track which employee a team-based target is for
}, { timestamps: true });

module.exports = mongoose.model('Target', TargetSchema);

