/**
 * Authentication Middleware
 * Verifies JWT tokens and protects routes
 */

const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware to protect routes by verifying JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check if token is in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'Not authorized, no token provided'
      });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from token
      const user = await User.findById(decoded.id);
      
      // Check if user exists
      if (!user) {
        return res.status(401).json({
          error: true,
          message: 'Not authorized, user does not exist'
        });
      }
      
      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          error: true,
          message: 'Account is disabled'
        });
      }
      
      // Set user in request
      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        error: true,
        message: 'Not authorized, token invalid or expired'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access to certain roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

/**
 * Middleware to check if user is owner of a resource or admin
 * Requires resourceModel and paramId to be specified
 */
exports.isOwnerOrAdmin = (resourceModel, paramId = 'id') => {
  return async (req, res, next) => {
    try {
      // Skip check for admins
      if (req.user.role === 'admin') {
        return next();
      }
      
      const resourceId = req.params[paramId];
      
      // Find resource
      const resource = await resourceModel.findById(resourceId);
      
      // Check if resource exists
      if (!resource) {
        return res.status(404).json({
          error: true,
          message: 'Resource not found'
        });
      }
      
      // Check if user is owner
      if (resource.owner && resource.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          error: true,
          message: 'You do not have permission to perform this action'
        });
      }
      
      // Set resource in request
      req.resource = resource;
      next();
    } catch (error) {
      next(error);
    }
  };
};
