/* ============================================================
   routes/auth.js — Authentication routes
   POST /api/auth/signup  → Create new account
   POST /api/auth/login   → Log in, receive JWT
   GET  /api/auth/me      → Get current user (protected)
   ============================================================ */

const express = require('express');
const router  = express.Router();

const { signup, login, getMe } = require('../controllers/authController');
const { protect }               = require('../middleware/auth');

// Public routes (no token needed)
router.post('/signup', signup);
router.post('/login',  login);

// Protected route (requires valid JWT)
router.get('/me', protect, getMe);

module.exports = router;
EOF

cat > /home/claude/campushireai/backend/routes/applications.js << 'EOF'
/* ============================================================
   routes/applications.js — Application CRUD routes
   All routes are protected — require a valid JWT.

   GET    /api/applications         → Get all user's applications
   GET    /api/applications/stats   → Get dashboard stats
   GET    /api/applications/:id     → Get single application
   POST   /api/applications         → Create new application
   PUT    /api/applications/:id     → Update an application
   DELETE /api/applications/:id     → Delete an application
   ============================================================ */

const express = require('express');
const router  = express.Router();

const {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats
} = require('../controllers/applicationController');

const { protect } = require('../middleware/auth');

// Apply protect middleware to ALL routes in this file
router.use(protect);

// Stats route must come BEFORE /:id to avoid 'stats' being parsed as an ID
router.get('/stats', getStats);

router.route('/')
  .get(getApplications)    // GET  /api/applications
  .post(createApplication); // POST /api/applications

router.route('/:id')
  .get(getApplicationById)   // GET    /api/applications/:id
  .put(updateApplication)    // PUT    /api/applications/:id
  .delete(deleteApplication); // DELETE /api/applications/:id

module.exports = router;
EOF

cat > /home/claude/campushireai/backend/routes/ai.js << 'EOF'
/* ============================================================
   routes/ai.js — AI Assistant routes
   POST /api/ai/ask  → Send a message, get AI response
   ============================================================ */

const express = require('express');
const router  = express.Router();

const { askAI }   = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// All AI routes require login
router.use(protect);

router.post('/ask', askAI);

module.exports = router;