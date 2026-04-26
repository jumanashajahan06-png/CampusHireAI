/* ============================================================
   models/User.js — User schema and model
   Stores: name, email, hashed password, university
   Includes: password hashing hook, password comparison method
   ============================================================ */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: [true, 'Name is required'],
      trim:     true,
      maxlength: [60, 'Name cannot exceed 60 characters']
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,           // enforced at DB level (creates index)
      lowercase: true,           // always store as lowercase
      trim:      true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Please provide a valid email address'
      ]
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select:    false  // Never return password in queries by default
    },

    university: {
      type:  String,
      trim:  true,
      default: ''
    },

    // User preferences (can be extended later)
    preferences: {
      emailReminders: { type: Boolean, default: true },
    }
  },
  {
    timestamps: true // Adds createdAt and updatedAt automatically
  }
);

/* ── Pre-save hook: Hash password before storing ─────────── */
// This runs automatically every time a user is saved/updated
userSchema.pre('save', async function (next) {
  // Only hash if the password field was actually modified
  // (prevents re-hashing on unrelated saves)
  if (!this.isModified('password')) return next();

  // Salt rounds: 12 is strong but still fast enough
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ── Instance method: Compare password ───────────────────── */
// Usage: const isMatch = await user.comparePassword(enteredPassword)
userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

/* ── Instance method: Return safe user object ────────────── */
// Strips sensitive fields before sending to frontend
userSchema.methods.toSafeObject = function () {
  return {
    id:         this._id,
    name:       this.name,
    email:      this.email,
    university: this.university,
    createdAt:  this.createdAt
  };
};

module.exports = mongoose.model('User', userSchema);