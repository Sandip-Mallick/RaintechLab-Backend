const mongoose = require('mongoose');

const ClientSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Client name is required'] },
    email: { 
        type: String, 
        unique: true, 
        required: [true, 'Email is required'],
        trim: true,
        lowercase: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address']
    },
    phone: { type: String, required: [true, 'Phone number is required'] },
    address: { type: String, required: [true, 'Address is required'] },
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
