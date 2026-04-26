/* ============================================================
   routes/ai.js — AI Assistant routes
   POST /api/ai/ask  → Send a message, get AI response
   ============================================================ */

const express = require('express');
const router  = express.Router();

const { askAI }   = require('../controllers/aiController');
const protect = require('../middleware/auth');

// All AI routes require login
router.use(protect);

router.post('/ask', askAI);

module.exports = router;