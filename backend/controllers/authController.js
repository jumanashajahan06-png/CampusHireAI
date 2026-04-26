/* ============================================================
   controllers/authController.js
   Handles: signup, login, getMe (get current user profile)
   ============================================================ */

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/* ── Helper: Generate a signed JWT ──────────────────────── */
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },          // payload — what we store in the token
    process.env.JWT_SECRET,  // secret key from .env
    { expiresIn: '7d' }      // token expires in 7 days
  );
};

/* ── POST /api/auth/signup ───────────────────────────────── */
const signup = async (req, res, next) => {
  try {
    const { name, email, university, password } = req.body;

    // Basic input validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Create the new user (password is hashed by the pre-save hook in User.js)
    const user = await User.create({ name, email, university, password });

    // Generate token for immediate login after signup
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    next(error); // Pass to global error handler
  }
};

/* ── POST /api/auth/login ────────────────────────────────── */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user by email — explicitly include password (it's select:false by default)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Use a vague message to prevent email enumeration attacks
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Compare entered password with the stored hash
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: user.toSafeObject()
    });

  } catch (error) {
    next(error);
  }
};

/* ── GET /api/auth/me ────────────────────────────────────── */
// Returns the current logged-in user's profile
// Requires the `protect` middleware to be applied on the route
const getMe = async (req, res, next) => {
  try {
    // req.user.id is set by the auth middleware after token verification
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: user.toSafeObject()
    });

  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, getMe };