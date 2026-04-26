/* ============================================================
   routes/auth.js — Authentication routes
   POST /api/auth/signup  → Create new account
   POST /api/auth/login   → Log in, receive JWT
   GET  /api/auth/me      → Get current user (protected)
   ============================================================ */

const express = require('express');
const router  = express.Router();

const { signup, login, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth');

// Public routes (no token needed)
router.post('/signup', signup);
router.post('/login',  login);

// Protected route (requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;