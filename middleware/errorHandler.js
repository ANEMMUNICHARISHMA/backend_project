import { errorResponse } from '../utils/apiResponse.js';

/**
 * Global error handler middleware for Express.
 * Catches all errors passed to next(err) and formats them into standardized JSON responses.
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // 1. Mongoose bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    return errorResponse(res, message, 404);
  }

  // 2. Mongoose duplicate key (code 11000)
  if (err.code === 11000) {
    // Determine which field was duplicated if possible (e.g., email)
    const field = Object.keys(err.keyValue)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return errorResponse(res, message, 409);
  }

  // 3. Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = 'Validation Error';
    // Extract field-by-field error messages from Mongoose Validation Error
    const errors = Object.values(err.errors).map(val => val.message);
    return errorResponse(res, message, 400, errors);
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    const message = 'Not authorized to access this route';
    return errorResponse(res, message, 401);
  }

  // 5. Default server error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Server error';
  
  // In development: include stack trace. In production: never send stack trace.
  const errors = process.env.NODE_ENV === 'development' ? err.stack : null;
  
  return errorResponse(res, message, statusCode, errors);
};

export default errorHandler;
