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

const protect = require('../middleware/auth');

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