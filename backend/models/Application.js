/* ============================================================
   models/Application.js — Job/Internship Application schema
   Stores all application details per user.
   ============================================================ */

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    // Each application belongs to one user
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true  // Index for fast lookups by user
    },

    company: {
      type:     String,
      required: [true, 'Company name is required'],
      trim:     true,
      maxlength: [100, 'Company name too long']
    },

    role: {
      type:     String,
      required: [true, 'Role / position is required'],
      trim:     true,
      maxlength: [100, 'Role name too long']
    },

    // Current stage of this application
    status: {
      type:    String,
      enum:    ['Applied', 'Interview', 'Offer', 'Rejected'],
      default: 'Applied'
    },

    jobType: {
      type:    String,
      enum:    ['Internship', 'Full-time', 'Part-time', 'Contract'],
      default: 'Internship'
    },

    location: {
      type:  String,
      trim:  true,
      default: ''
    },

    // When the user submitted this application
    dateApplied: {
      type:    Date,
      default: Date.now
    },

    // Application deadline (optional)
    deadline: {
      type:    Date,
      default: null
    },

    // Salary / stipend info (optional)
    salary: {
      type:  String,
      trim:  true,
      default: ''
    },

    // Free-form notes: interview prep, contacts, links, etc.
    notes: {
      type:  String,
      trim:  true,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },

    // Link to the job posting
    jobUrl: {
      type:  String,
      trim:  true,
      default: ''
    }
  },
  {
    timestamps: true // createdAt + updatedAt
  }
);

/* ── Compound index: quickly fetch a user's sorted apps ──── */
applicationSchema.index({ user: 1, createdAt: -1 });

/* ── Virtual: days until deadline ───────────────────────── */
// Accessible as application.daysUntilDeadline (not stored in DB)
applicationSchema.virtual('daysUntilDeadline').get(function () {
  if (!this.deadline) return null;
  const now = new Date();
  const diff = this.deadline - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Include virtuals when converting to JSON
applicationSchema.set('toJSON',   { virtuals: true });
applicationSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Application', applicationSchema);