const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Remove deprecated options for newer Mongoose versions
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
    });
    
    return conn;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    console.error('Connection string:', process.env.MONGODB_URI);
    process.exit(1);
  }
};

module.exports = connectDB;
