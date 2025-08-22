/**
 * Routes Index
 * Combines all API routes
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const schemaRoutes = require('./schema.routes');
const generatorRoutes = require('./generator.routes');
const userRoutes = require('./user.routes');

// Register route modules with appropriate prefixes
router.use('/auth', authRoutes);
router.use('/schemas', schemaRoutes);
router.use('/generate', generatorRoutes);
router.use('/users', userRoutes);

// API health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Mock-Mint API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router;
