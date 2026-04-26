/* ============================================================
   middleware/auth.js — JWT Authentication middleware
   Verifies the Bearer token on protected routes.
   Attaches the decoded user payload to req.user.
   ============================================================ */

const jwt = require('jsonwebtoken');

/**
 * Protect a route — requires a valid JWT in the Authorization header.
 *
 * Usage in a route file:
 *   router.get('/profile', protect, getProfile);
 *
 * The frontend sends:
 *   Authorization: Bearer <token>
 */
const protect = (req, res, next) => {
  // 1. Extract token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized — no token provided'
    });
  }

  const token = authHeader.split(' ')[1]; // Get the part after "Bearer "

  try {
    // 2. Verify the token using our secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Attach the decoded payload to the request object
    // Now every protected route handler can access req.user.id
    req.user = decoded;

    next(); // Proceed to the route handler

  } catch (error) {
    // Token is invalid or expired — pass to global error handler
    next(error);
  }
};

module.exports = { protect };