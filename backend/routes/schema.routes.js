/**
 * Schema Routes
 * Routes for schema management and parsing
 */

const express = require('express');
const router = express.Router();

const schemaController = require('../controllers/schema.controller');
const { protect, isOwnerOrAdmin } = require('../middleware/auth.middleware');
const { schemaValidators } = require('../middleware/validators');
const Schema = require('../models/schema.model');

// Public schema routes
router.get('/public', schemaController.getPublicSchemas);

// Protected routes
router.use(protect);

// Parse schema from various formats
router.post('/parse', schemaValidators.parseSchema, schemaController.parseSchema);

// CRUD operations for user schemas
router.route('/')
  .get(schemaController.getSchemas)
  .post(schemaValidators.createSchema, schemaController.createSchema);

// Schema operations by ID
router.route('/:id')
  .get(schemaController.getSchemaById)
  .put(
    schemaValidators.updateSchema, 
    isOwnerOrAdmin(Schema, 'id'), 
    schemaController.updateSchema
  )
  .delete(
    isOwnerOrAdmin(Schema, 'id'), 
    schemaController.deleteSchema
  );

module.exports = router;
