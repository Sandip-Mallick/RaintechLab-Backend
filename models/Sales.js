// models/Sales.js
const mongoose = require('mongoose');

const SalesSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    clientName: { type: String, required: true },
    salesAmount: { type: Number, required: true },
    salesQty: { type: Number, required: true },
    sourcingCost: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sales', SalesSchema);
