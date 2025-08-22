/**
 * Auth Routes
 * Routes for authentication and user management
 */

const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { authValidators } = require('../middleware/validators');

// Public routes
router.post('/register', authValidators.register, authController.register);
router.post('/login', authValidators.login, authController.login);
router.post('/validate-token', authController.validateToken);

// Protected routes - require authentication
router.use(protect);
router.get('/me', authController.getMe);
router.put('/me', authValidators.updateProfile, authController.updateMe);
router.post('/change-password', authValidators.changePassword, authController.changePassword);

module.exports = router;
