/**
 * Schema Controller
 * Handles schema CRUD operations and schema parsing
 */

const { validationResult } = require('express-validator');
const Schema = require('../models/schema.model');
const History = require('../models/history.model');

// Import core library parsers and utils
const coreParsers = require('../../core/parsers');
const { validateSchema, enhanceSchema } = require('../../core/utils/schemaUtils');

/**
 * Create a new schema
 * @route POST /api/schemas
 * @access Private
 */
exports.createSchema = async (req, res, next) => {
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

    const { title, description, format, fields, isPublic, tags } = req.body;

    // Validate schema structure
    if (fields && typeof fields === 'object') {
      const validationResult = validateSchema({ type: 'object', fields });
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: true,
          message: 'Invalid schema structure',
          details: validationResult.error
        });
      }
    }

    // Create schema
    const schema = await Schema.create({
      title,
      description,
      format: format || null,
      fields: fields || {},
      tags: tags || [],
      isPublic: !!isPublic,
      owner: req.user._id
    });

    res.status(201).json({
      error: false,
      message: 'Schema created successfully',
      data: {
        schema: {
          id: schema._id,
          title: schema.title,
          description: schema.description,
          format: schema.format,
          fieldsCount: schema.fields instanceof Map ? schema.fields.size : Object.keys(schema.fields || {}).length,
          tags: schema.tags,
          isPublic: schema.isPublic,
          createdAt: schema.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all user's schemas
 * @route GET /api/schemas
 * @access Private
 */
exports.getSchemas = async (req, res, next) => {
  try {
    const { 
      search, 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc', 
      tags,
      public 
    } = req.query;

    // Build query
    const query = { owner: req.user._id };
    
    // Handle text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    // Filter by public/private
    if (public !== undefined) {
      query.isPublic = public === 'true';
    }
    
    // Build sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const schemas = await Schema.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum);
    
    // Get total count
    const total = await Schema.countDocuments(query);

    res.status(200).json({
      error: false,
      data: {
        schemas: schemas.map(schema => ({
          id: schema._id,
          title: schema.title,
          description: schema.description,
          format: schema.format,
          fieldsCount: schema.fields instanceof Map ? schema.fields.size : Object.keys(schema.fields || {}).length,
          tags: schema.tags,
          isPublic: schema.isPublic,
          createdAt: schema.createdAt,
          updatedAt: schema.updatedAt
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
 * Get schema by ID
 * @route GET /api/schemas/:id
 * @access Private
 */
exports.getSchemaById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find schema
    const schema = await Schema.findById(id);
    
    // Check if schema exists
    if (!schema) {
      return res.status(404).json({
        error: true,
        message: 'Schema not found'
      });
    }
    
    // Check if user can access this schema
    if (!schema.canAccess(req.user._id)) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to access this schema'
      });
    }

    // Convert fields to object if it's a Map
    const fields = {};
    if (schema.fields instanceof Map) {
      for (const [key, value] of schema.fields.entries()) {
        fields[key] = value;
      }
    } else {
      Object.assign(fields, schema.fields || {});
    }

    res.status(200).json({
      error: false,
      data: {
        schema: {
          id: schema._id,
          title: schema.title,
          description: schema.description,
          format: schema.format,
          type: schema.type,
          fields,
          definitions: schema.definitions,
          tags: schema.tags,
          isPublic: schema.isPublic,
          owner: schema.owner,
          createdAt: schema.createdAt,
          updatedAt: schema.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update schema
 * @route PUT /api/schemas/:id
 * @access Private
 */
exports.updateSchema = async (req, res, next) => {
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
    const { title, description, fields, isPublic, tags } = req.body;
    
    // Find schema
    const schema = await Schema.findById(id);
    
    // Check if schema exists
    if (!schema) {
      return res.status(404).json({
        error: true,
        message: 'Schema not found'
      });
    }
    
    // Check if user owns this schema
    if (schema.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to update this schema'
      });
    }

    // Validate schema structure if fields are provided
    if (fields && typeof fields === 'object') {
      const validationResult = validateSchema({ type: 'object', fields });
      if (!validationResult.isValid) {
        return res.status(400).json({
          error: true,
          message: 'Invalid schema structure',
          details: validationResult.error
        });
      }
    }

    // Update schema
    if (title !== undefined) schema.title = title;
    if (description !== undefined) schema.description = description;
    if (fields !== undefined) schema.fields = fields;
    if (isPublic !== undefined) schema.isPublic = isPublic;
    if (tags !== undefined) schema.tags = tags;

    await schema.save();
    
    // Convert fields to object for response
    const responseFields = {};
    if (schema.fields instanceof Map) {
      for (const [key, value] of schema.fields.entries()) {
        responseFields[key] = value;
      }
    } else {
      Object.assign(responseFields, schema.fields || {});
    }

    res.status(200).json({
      error: false,
      message: 'Schema updated successfully',
      data: {
        schema: {
          id: schema._id,
          title: schema.title,
          description: schema.description,
          format: schema.format,
          fields: responseFields,
          tags: schema.tags,
          isPublic: schema.isPublic,
          updatedAt: schema.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete schema
 * @route DELETE /api/schemas/:id
 * @access Private
 */
exports.deleteSchema = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Find schema
    const schema = await Schema.findById(id);
    
    // Check if schema exists
    if (!schema) {
      return res.status(404).json({
        error: true,
        message: 'Schema not found'
      });
    }
    
    // Check if user owns this schema
    if (schema.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: true,
        message: 'You do not have permission to delete this schema'
      });
    }

    // Delete schema
    await schema.remove();

    res.status(200).json({
      error: false,
      message: 'Schema deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parse schema from various formats
 * @route POST /api/schemas/parse
 * @access Private
 */
exports.parseSchema = async (req, res, next) => {
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

    const { schema, format, options } = req.body;
    
    // Check if schema is provided
    if (!schema) {
      return res.status(400).json({
        error: true,
        message: 'Schema is required'
      });
    }
    
    try {
      // Parse schema using core parsers
      let parsedSchema;
      
      if (format) {
        // Use specified format
        parsedSchema = coreParsers.parseSchema(schema, format, options);
      } else {
        // Auto-detect format
        parsedSchema = coreParsers.parseSchema(schema, null, options);
      }
      
      // Enhance schema with defaults based on field names
      const enhancedSchema = enhanceSchema(parsedSchema);

      res.status(200).json({
        error: false,
        message: 'Schema parsed successfully',
        data: {
          schema: enhancedSchema,
          detectedFormat: parsedSchema.format || format
        }
      });
    } catch (error) {
      return res.status(400).json({
        error: true,
        message: 'Failed to parse schema',
        details: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get public schemas
 * @route GET /api/schemas/public
 * @access Public
 */
exports.getPublicSchemas = async (req, res, next) => {
  try {
    const { 
      search, 
      page = 1, 
      limit = 10, 
      sort = 'createdAt', 
      order = 'desc',
      tags
    } = req.query;

    // Build query
    const query = { isPublic: true };
    
    // Handle text search
    if (search) {
      query.$text = { $search: search };
    }
    
    // Filter by tags
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    // Build sort options
    const sortOptions = {};
    sortOptions[sort] = order === 'asc' ? 1 : -1;

    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const schemas = await Schema.findPublicSchemas(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('owner', 'username');
    
    // Get total count
    const total = await Schema.countDocuments({ ...query, isPublic: true });

    res.status(200).json({
      error: false,
      data: {
        schemas: schemas.map(schema => ({
          id: schema._id,
          title: schema.title,
          description: schema.description,
          format: schema.format,
          fieldsCount: schema.fields instanceof Map ? schema.fields.size : Object.keys(schema.fields || {}).length,
          tags: schema.tags,
          owner: schema.owner ? {
            id: schema.owner._id,
            username: schema.owner.username
          } : null,
          createdAt: schema.createdAt
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
