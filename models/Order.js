const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    clientName: { type: String, required: true },
    orderAmount: { type: Number, required: true },
    orderQty: { type: Number, required: true },
    sourcingCost: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'completed' }
});

module.exports = mongoose.model('Order', OrderSchema); 