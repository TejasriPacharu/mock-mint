/**
 * User Controller
 * Handles user management operations (admin)
 */

const { validationResult } = require('express-validator');
const User = require('../models/user.model');
const History = require('../models/history.model');
const Schema = require('../models/schema.model');

/**
 * Get all users (admin only)
 * @route GET /api/users
 * @access Private/Admin
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc',
      search,
      role,
      isActive
    } = req.query;

    // Build query
    const query = {};
    
    // Handle text search
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by role
    if (role) {
      query.role = role;
    }
    
    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    // Build sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const users = await User.find(query)
      .select('-password')
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const total = await User.countDocuments(query);

    res.status(200).json({
      error: false,
      data: {
        users: users.map(user => ({
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        })),
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID (admin only)
 * @route GET /api/users/:id
 * @access Private/Admin
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    res.status(200).json({
      error: false,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          settings: user.settings,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (admin only)
 * @route PUT /api/users/:id
 * @access Private/Admin
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: true,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { firstName, lastName, role, isActive } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Update user fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      error: false,
      message: 'User updated successfully',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset user password (admin only)
 * @route POST /api/users/:id/reset-password
 * @access Private/Admin
 */
exports.resetPassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: true,
        message: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const { newPassword } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Update user password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      error: false,
      message: 'Password reset successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics (admin only)
 * @route GET /api/users/:id/stats
 * @access Private/Admin
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }

    // Get user statistics
    const stats = await Promise.all([
      History.getUserStatistics(id),
      Schema.countDocuments({ owner: id }),
      Schema.countDocuments({ owner: id, isPublic: true })
    ]);

    const [generationStats, totalSchemas, publicSchemas] = stats;

    res.status(200).json({
      error: false,
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email
        },
        stats: {
          schemas: {
            total: totalSchemas,
            public: publicSchemas,
            private: totalSchemas - publicSchemas
          },
          generation: generationStats
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system statistics (admin only)
 * @route GET /api/users/stats
 * @access Private/Admin
 */
exports.getSystemStats = async (req, res, next) => {
  try {
    // Get system statistics
    const stats = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ isActive: true }),
      Schema.countDocuments(),
      Schema.countDocuments({ isPublic: true }),
      History.countDocuments(),
      History.aggregate([
        { $group: { _id: null, total: { $sum: '$statistics.recordCount' } } }
      ])
    ]);

    const [
      totalUsers,
      adminUsers,
      activeUsers,
      totalSchemas,
      publicSchemas,
      totalGenerations,
      recordsGenerated
    ] = stats;

    // Get user registrations per month
    const userRegistrations = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Get data generations per month
    const dataGenerations = await History.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          records: { $sum: '$statistics.recordCount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.status(200).json({
      error: false,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          admin: adminUsers
        },
        schemas: {
          total: totalSchemas,
          public: publicSchemas,
          private: totalSchemas - publicSchemas
        },
        generations: {
          total: totalGenerations,
          records: recordsGenerated.length > 0 ? recordsGenerated[0].total : 0
        },
        trends: {
          userRegistrations: userRegistrations.map(item => ({
            year: item._id.year,
            month: item._id.month,
            count: item.count
          })),
          dataGenerations: dataGenerations.map(item => ({
            year: item._id.year,
            month: item._id.month,
            count: item.count,
            records: item.records
          }))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
