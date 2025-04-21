// models/User.js
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        maxlength: [100, 'Name cannot be longer than 100 characters'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long']
    },
    role: { 
        type: String, 
        enum: ['Admin', 'Employee', 'Team Manager'], 
        default: 'Employee' 
    },
    permissions: {
        type: String,
        enum: ['Sales', 'Orders', 'Sales & Orders', 'All Permissions'],
        default: 'Sales & Orders'
    },
    teamId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Team', 
        default: null 
    },
    profilePic: { 
        type: String, 
        default: '' 
    },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
