/* ============================================================
   middleware/errorHandler.js — Global error handler
   Catches any error passed via next(err) in route handlers.
   Sends a clean JSON response instead of crashing the server.
   ============================================================ */

const errorHandler = (err, req, res, next) => {
  // Log the error for debugging (in production, use a logger like Winston)
  console.error(`[Error] ${req.method} ${req.path} →`, err.message);

  // Determine HTTP status code
  // If the error object has a statusCode, use it; otherwise default to 500
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // Handle specific Mongoose / MongoDB errors
  if (err.name === 'ValidationError') {
    // Mongoose schema validation failed
    statusCode = 400;
    // Collect all field-level validation messages into one string
    message = Object.values(err.errors).map(e => e.message).join(', ');
  }

  if (err.name === 'CastError') {
    // Invalid MongoDB ObjectId (e.g., /applications/not-a-valid-id)
    statusCode = 400;
    message = `Invalid ID format`;
  }

  if (err.code === 11000) {
    // MongoDB duplicate key error (e.g., email already registered)
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired, please log in again';
  }

  // Send JSON error response
  res.status(statusCode).json({
    success: false,
    message,
    // Only include stack trace in development mode
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler;