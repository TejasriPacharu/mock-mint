/**
 * Generator Routes
 * Routes for mock data generation and history
 */

const express = require('express');
const router = express.Router();

const generatorController = require('../controllers/generator.controller');
const { protect } = require('../middleware/auth.middleware');
const { generatorValidators } = require('../middleware/validators');

// All generator routes are protected
router.use(protect);

// Generate mock data
router.post('/', generatorValidators.generateData, generatorController.generateData);

// Generate a single sample record
router.post('/sample', generatorValidators.generateSample, generatorController.generateSample);

// Test API endpoint with a sample record
router.post('/test-api', generatorValidators.testApi, generatorController.testApiEndpoint);

// Get generation history
router.get('/history', generatorController.getHistory);

// Get user statistics
router.get('/stats', generatorController.getStatistics);

module.exports = router;
