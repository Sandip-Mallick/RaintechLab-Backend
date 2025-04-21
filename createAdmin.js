// createAdmin.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

// Admin user details
const adminUser = {
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'securePassword123',
  role: 'Admin',
  permissions: 'All Permissions'  // Set admin permission explicitly
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Connected');
    
    try {
      // Check if admin already exists
      const existingUser = await User.findOne({ email: adminUser.email });
      
      if (existingUser) {
        console.log('Admin user already exists');
        mongoose.disconnect();
        return;
      }
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminUser.password, 10);
      
      // Create admin user
      const user = new User({
        name: adminUser.name,
        email: adminUser.email,
        password: hashedPassword,
        role: adminUser.role,
        permissions: adminUser.permissions  
      });
      
      await user.save();
      console.log('Admin user created successfully');
      
    } catch (err) {
      console.error('Error creating admin user:', err);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  }); 