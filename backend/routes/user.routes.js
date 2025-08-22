/**
 * User Routes
 * Routes for user management (admin)
 */

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');
const { userValidators } = require('../middleware/validators');

// All user routes are protected and restricted to admins
router.use(protect);
router.use(restrictTo('admin'));

// System statistics route
router.get('/stats', userController.getSystemStats);

// User listing
router.get('/', userController.getUsers);

// User operations by ID
router.route('/:id')
  .get(userController.getUserById)
  .put(userValidators.updateUser, userController.updateUser);

// User statistics
router.get('/:id/stats', userController.getUserStats);

// Reset user password
router.post('/:id/reset-password', userValidators.resetPassword, userController.resetPassword);

module.exports = router;
