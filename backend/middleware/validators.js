/**
 * Request validation middleware
 * Using express-validator for input validation
 */

const { body, param, query } = require('express-validator');

/**
 * Authentication validators
 */
exports.authValidators = {
  // User registration validator
  register: [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/)
      .withMessage('Password must contain at least one letter'),
    
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters')
  ],

  // User login validator
  login: [
    body('email')
      .isEmail()
      .withMessage('Please enter a valid email')
      .normalizeEmail(),
    
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  // Update profile validator
  updateProfile: [
    body('firstName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    
    body('lastName')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    
    body('settings')
      .optional()
      .isObject()
      .withMessage('Settings must be an object')
  ],

  // Change password validator
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/\d/)
      .withMessage('Password must contain at least one number')
      .matches(/[a-zA-Z]/)
      .withMessage('Password must contain at least one letter')
  ]
};

/**
 * Schema validators
 */
exports.schemaValidators = {
  // Create schema validator
  createSchema: [
    body('title')
      .notEmpty()
      .withMessage('Title is required')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    
    body('format')
      .optional()
      .isIn(['json', 'mongoose', 'sql', 'typescript', null])
      .withMessage('Invalid format specified'),
    
    body('fields')
      .optional()
      .isObject()
      .withMessage('Fields must be an object'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('tags.*')
      .optional()
      .isString()
      .withMessage('Each tag must be a string')
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Tags must be between 1 and 30 characters')
  ],

  // Update schema validator
  updateSchema: [
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Description must be less than 500 characters'),
    
    body('fields')
      .optional()
      .isObject()
      .withMessage('Fields must be an object'),
    
    body('isPublic')
      .optional()
      .isBoolean()
      .withMessage('isPublic must be a boolean'),
    
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    
    body('tags.*')
      .optional()
      .isString()
      .withMessage('Each tag must be a string')
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage('Tags must be between 1 and 30 characters')
  ],

  // Parse schema validator
  parseSchema: [
    body('schema')
      .notEmpty()
      .withMessage('Schema is required'),
    
    body('format')
      .optional()
      .isIn(['json', 'mongoose', 'sql', 'typescript'])
      .withMessage('Invalid format specified'),
    
    body('options')
      .optional()
      .isObject()
      .withMessage('Options must be an object')
  ]
};

/**
 * Generator validators
 */
exports.generatorValidators = {
  // Generate data validator
  generateData: [
    body('schemaId')
      .optional()
      .isMongoId()
      .withMessage('Invalid schema ID'),
    
    body('schemaData')
      .optional()
      .isObject()
      .withMessage('Schema data must be an object'),
    
    body('count')
      .optional()
      .isInt({ min: 1, max: 10000 })
      .withMessage('Count must be between 1 and 10000'),
    
    body('format')
      .optional()
      .isIn(['json', 'csv', 'sql'])
      .withMessage('Format must be json, csv, or sql'),
    
    body('exportOptions')
      .optional()
      .isObject()
      .withMessage('Export options must be an object'),
    
    body('saveHistory')
      .optional()
      .isBoolean()
      .withMessage('saveHistory must be a boolean'),
    
    body('apiDestination')
      .optional()
      .isObject()
      .withMessage('API destination must be an object'),
    
    body('apiDestination.url')
      .optional()
      .isURL()
      .withMessage('API URL must be a valid URL'),
    
    body('apiDestination.method')
      .optional()
      .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .withMessage('API method must be GET, POST, PUT, PATCH, or DELETE'),
    
    body('apiDestination.batchSize')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage('Batch size must be between 1 and 1000')
  ],

  // Generate sample validator
  generateSample: [
    body('schemaId')
      .optional()
      .isMongoId()
      .withMessage('Invalid schema ID'),
    
    body('schemaData')
      .optional()
      .isObject()
      .withMessage('Schema data must be an object'),
    
    body('format')
      .optional()
      .isIn(['json', 'csv', 'sql'])
      .withMessage('Format must be json, csv, or sql')
  ],

  // Test API validator
  testApi: [
    body('schemaId')
      .optional()
      .isMongoId()
      .withMessage('Invalid schema ID'),
    
    body('schemaData')
      .optional()
      .isObject()
      .withMessage('Schema data must be an object'),
    
    body('apiConfig')
      .notEmpty()
      .withMessage('API configuration is required')
      .isObject()
      .withMessage('API configuration must be an object'),
    
    body('apiConfig.url')
      .notEmpty()
      .withMessage('API URL is required')
      .isURL()
      .withMessage('API URL must be a valid URL'),
    
    body('apiConfig.method')
      .optional()
      .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
      .withMessage('API method must be GET, POST, PUT, PATCH, or DELETE')
  ]
};

/**
 * User route validators
 */
exports.userValidators = {
  // Update user validator (admin)
  updateUser: [
    body('firstName')
      .optional()
      .isString()
      .withMessage('First name must be a string')
      .isLength({ min: 1, max: 50 })
      .withMessage('First name must be between 1 and 50 characters'),
    body('lastName')
      .optional()
      .isString()
      .withMessage('Last name must be a string')
      .isLength({ min: 1, max: 50 })
      .withMessage('Last name must be between 1 and 50 characters'),
    body('role')
      .optional()
      .isIn(['user', 'admin'])
      .withMessage('Role must be either "user" or "admin"'),
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean value')
  ],

  // Reset password validator (admin)
  resetPassword: [
    body('newPassword')
      .isString()
      .withMessage('New password must be a string')
      .isLength({ min: 8, max: 128 })
      .withMessage('New password must be between 8 and 128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
  ]
};

module.exports = {
  authValidators: exports.authValidators,
  schemaValidators: exports.schemaValidators,
  generatorValidators: exports.generatorValidators,
  userValidators: exports.userValidators
};
