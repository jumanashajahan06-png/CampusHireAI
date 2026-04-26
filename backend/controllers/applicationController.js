/* ============================================================
   controllers/applicationController.js
   Full CRUD for job/internship applications.
   All routes are user-scoped: users only see their own data.
   ============================================================ */

const Application = require('../models/Application');

/* ── GET /api/applications ───────────────────────────────── */
// Returns all applications for the logged-in user
const getApplications = async (req, res, next) => {
  try {
    // Parse optional query params for filtering/sorting
    const { status, sort = '-createdAt', search } = req.query;

    // Build filter — always restrict to current user's data
    const filter = { user: req.user.id };

    // Optional status filter: ?status=Interview
    if (status && status !== 'all') {
      filter.status = status;
    }

    // Optional text search: ?search=google
    if (search) {
      filter.$or = [
        { company: { $regex: search, $options: 'i' } }, // case-insensitive
        { role:    { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await Application.find(filter)
      .sort(sort)         // e.g. '-createdAt' = newest first
      .lean();            // .lean() returns plain JS objects (faster)

    // Compute quick stats to send alongside applications
    const allApps = await Application.find({ user: req.user.id }).lean();
    const stats = {
      total:     allApps.length,
      applied:   allApps.filter(a => a.status === 'Applied').length,
      interview: allApps.filter(a => a.status === 'Interview').length,
      offer:     allApps.filter(a => a.status === 'Offer').length,
      rejected:  allApps.filter(a => a.status === 'Rejected').length,
    };

    res.json({
      success: true,
      count: applications.length,
      stats,
      applications
    });

  } catch (error) {
    next(error);
  }
};

/* ── GET /api/applications/:id ───────────────────────────── */
// Get a single application by ID
const getApplicationById = async (req, res, next) => {
  try {
    const app = await Application.findOne({
      _id:  req.params.id,
      user: req.user.id      // Security: only fetch if it belongs to this user
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({ success: true, application: app });

  } catch (error) {
    next(error);
  }
};

/* ── POST /api/applications ──────────────────────────────── */
// Create a new application
const createApplication = async (req, res, next) => {
  try {
    const {
      company, role, status, jobType,
      location, dateApplied, deadline,
      salary, notes, jobUrl
    } = req.body;

    // Validate required fields
    if (!company || !role) {
      return res.status(400).json({
        success: false,
        message: 'Company and role are required'
      });
    }

    const application = await Application.create({
      user: req.user.id,  // Link to the current user
      company,
      role,
      status:      status      || 'Applied',
      jobType:     jobType     || 'Internship',
      location:    location    || '',
      dateApplied: dateApplied || new Date(),
      deadline:    deadline    || null,
      salary:      salary      || '',
      notes:       notes       || '',
      jobUrl:      jobUrl      || '',
    });

    res.status(201).json({
      success: true,
      message: 'Application created',
      application
    });

  } catch (error) {
    next(error);
  }
};

/* ── PUT /api/applications/:id ───────────────────────────── */
// Update an existing application
const updateApplication = async (req, res, next) => {
  try {
    // Fields the user is allowed to update
    const allowedFields = [
      'company', 'role', 'status', 'jobType',
      'location', 'dateApplied', 'deadline',
      'salary', 'notes', 'jobUrl'
    ];

    // Build an update object with only the allowed fields
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // findOneAndUpdate with { new: true } returns the updated document
    const app = await Application.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id }, // Security: must belong to user
      updates,
      { new: true, runValidators: true }
    );

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application updated',
      application: app
    });

  } catch (error) {
    next(error);
  }
};

/* ── DELETE /api/applications/:id ────────────────────────── */
// Delete an application
const deleteApplication = async (req, res, next) => {
  try {
    const app = await Application.findOneAndDelete({
      _id:  req.params.id,
      user: req.user.id  // Security: must belong to user
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.json({
      success: true,
      message: 'Application deleted',
      deletedId: req.params.id
    });

  } catch (error) {
    next(error);
  }
};

/* ── GET /api/applications/stats ─────────────────────────── */
// Return dashboard statistics
const getStats = async (req, res, next) => {
  try {
    const apps = await Application.find({ user: req.user.id }).lean();

    const now      = new Date();
    const upcoming = apps
      .filter(a => a.deadline && new Date(a.deadline) > now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 5);

    res.json({
      success: true,
      stats: {
        total:     apps.length,
        applied:   apps.filter(a => a.status === 'Applied').length,
        interview: apps.filter(a => a.status === 'Interview').length,
        offer:     apps.filter(a => a.status === 'Offer').length,
        rejected:  apps.filter(a => a.status === 'Rejected').length,
        upcoming
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApplications,
  getApplicationById,
  createApplication,
  updateApplication,
  deleteApplication,
  getStats
};