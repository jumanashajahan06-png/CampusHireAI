/* ============================================================
   config/db.js — MongoDB connection setup
   Uses Mongoose to connect to the database.
   Exits the process if connection fails.
   ============================================================ */

const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These options suppress deprecation warnings
      useNewUrlParser:    true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // Exit process with failure — app cannot run without DB
    process.exit(1);
  }
};

module.exports = connectDB;