/* ============================================================
   server.js — Express entry point (Phase 7: production-ready)
   - Security headers
   - Rate limiting
   - Request logging
   - Graceful static file serving
   ============================================================ */
require('node:dns/promises').setServers(['1.1.1.1', '8.8.8.8']);

const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const connectDB    = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

const authRoutes        = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const aiRoutes          = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ── Connect to MongoDB ─────────────────────────────────── */
connectDB();

/* ── Security: basic headers ───────────────────────────── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options',        'DENY');
  res.setHeader('X-XSS-Protection',       '1; mode=block');
  res.setHeader('Referrer-Policy',        'strict-origin-when-cross-origin');
  next();
});

/* ── Simple in-memory rate limiter ──────────────────────── */
// Limits each IP to 100 API requests per 15 minutes.
// Replace with the `express-rate-limit` package in production.
const rateLimitMap = new Map();
const RATE_WINDOW  = 15 * 60 * 1000; // 15 minutes in ms
const RATE_MAX     = 100;             // requests per window

app.use('/api', (req, res, next) => {
  const ip  = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

  // Reset window if expired
  if (now > record.resetAt) {
    record.count   = 0;
    record.resetAt = now + RATE_WINDOW;
  }

  record.count++;
  rateLimitMap.set(ip, record);

  // Set helpful headers
  res.setHeader('X-RateLimit-Limit',     RATE_MAX);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_MAX - record.count));

  if (record.count > RATE_MAX) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down and try again in a few minutes.'
    });
  }
  next();
});

/* ── CORS ───────────────────────────────────────────────── */
app.use(cors({
  origin: true,        // Allow all origins in dev. Lock down in production.
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Body parsing ───────────────────────────────────────── */
app.use(express.json({ limit: '10kb' })); // Reject oversized payloads

/* ── Simple request logger (dev only) ──────────────────── */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const ms    = Date.now() - start;
      const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // red/green
      console.log(`${color}${req.method}\x1b[0m ${req.path} → ${res.statusCode} (${ms}ms)`);
    });
    next();
  });
}

/* ── Serve static frontend ──────────────────────────────── */
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── API Routes ─────────────────────────────────────────── */
app.use('/api/auth',         authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/ai',           aiRoutes);

/* ── Health check ───────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status:    'ok',
    app:       'CampusHire AI',
    version:   '1.0.0',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
    aiEnabled: !!(process.env.ANTHROPIC_API_KEY &&
                  process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here'),
  });
});

/* ── 404 handler for unknown API routes ─────────────────── */
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `API endpoint not found: ${req.path}` });
});

/* ── Serve frontend for all non-API routes ─────────────── */
app.get("*", (req, res) => {
  const pagesDir = path.join(__dirname, "../frontend/pages");

  let filePath;

  // If root → load index.html
  if (req.path === "/") {
    filePath = path.join(pagesDir, "index.html");
  }
  // If no extension → treat as page (e.g., /login → login.html)
  else if (!path.extname(req.path)) {
    filePath = path.join(pagesDir, req.path + ".html");
  }
  // If extension exists → direct file (e.g., /dashboard.html)
  else {
    filePath = path.join(pagesDir, req.path);
  }

  res.sendFile(filePath, (err) => {
    if (err) {
      res.sendFile(path.join(pagesDir, "404.html"));
    }
  });
});

/* ── Global error handler ───────────────────────────────── */
app.use(errorHandler);

/* ── Start ──────────────────────────────────────────────── */
const server = app.listen(PORT, () => {
  const ai = process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here';
  console.log(`\n🚀  CampusHire AI  →  http://localhost:${PORT}`);
  console.log(`🤖  AI Assistant   →  ${ai ? '✅ Claude enabled' : '⚡ Demo mode (add ANTHROPIC_API_KEY to enable)'}`);
  console.log(`📋  Health check   →  http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown on Ctrl+C
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

module.exports = app;