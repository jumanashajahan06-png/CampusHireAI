/* ============================================================
   server.js — Express app entry point
   Sets up middleware, routes, and starts the server
   ============================================================ */

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const connectDB     = require('./config/db');
const errorHandler  = require('./middleware/errorHandler');

// Route files
const authRoutes        = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const aiRoutes          = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Connect to MongoDB ─────────────────────────────────── */
connectDB();

/* ── Middleware ─────────────────────────────────────────── */

// Allow cross-origin requests from the frontend
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000'],
  credentials: true
}));

// Parse incoming JSON bodies
app.use(express.json());

// Serve static frontend files from /frontend folder
// This lets you open pages directly via the Node server
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── API Routes ─────────────────────────────────────────── */
app.use('/api/auth',         authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai',           aiRoutes);

/* ── Health check endpoint ──────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'CampusHire AI API is running',
    timestamp: new Date().toISOString()
  });
});

/* ── Serve frontend for any non-API route ───────────────── */
// This catches all unknown routes and sends the landing page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/pages/index.html'));
});

/* ── Global error handler (must be last middleware) ─────── */
app.use(errorHandler);

/* ── Start server ───────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`\n🚀 CampusHire AI server running on http://localhost:${PORT}`);
  console.log(`📋 API docs: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;