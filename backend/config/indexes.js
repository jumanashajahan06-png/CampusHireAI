/* ============================================================
   config/indexes.js — MongoDB index management script
   Run this ONCE after connecting to production DB to ensure
   all performance indexes are created.

   Usage: node backend/config/indexes.js
   ============================================================ */

require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose    = require('mongoose');
const User        = require('../models/User');
const Application = require('../models/Application');

async function createIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ── User indexes ──────────────────────────────────
    // email must be unique (already defined in schema — this ensures it's applied)
    await User.collection.createIndex({ email: 1 }, { unique: true });
    console.log('✅ User.email         — unique index');

    // ── Application indexes ───────────────────────────
    // Primary query pattern: find all apps for a user, sorted newest-first
    await Application.collection.createIndex({ user: 1, createdAt: -1 });
    console.log('✅ Application.user+createdAt — compound index (primary queries)');

    // Filter by status within a user's apps
    await Application.collection.createIndex({ user: 1, status: 1 });
    console.log('✅ Application.user+status    — compound index (status filter)');

    // Deadline reminders: find apps with upcoming deadlines
    await Application.collection.createIndex({ user: 1, deadline: 1 });
    console.log('✅ Application.user+deadline  — compound index (deadline queries)');

    // Text search on company and role fields
    await Application.collection.createIndex(
      { company: 'text', role: 'text', notes: 'text' },
      { name: 'application_text_search' }
    );
    console.log('✅ Application text search    — text index (company, role, notes)');

    console.log('\n🎉 All indexes created successfully!');
  } catch (err) {
    console.error('❌ Index creation failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

createIndexes();