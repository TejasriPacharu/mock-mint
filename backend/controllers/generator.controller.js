/**
 * Generator Controller
 * Handles generation of mock data from schemas
 */

const { validationResult } = require('express-validator');
const Schema = require('../models/schema.model');
const History = require('../models/history.model');

// Import core library generators and utils
const { generateRecord, generateRecords } = require('../../core/generators/recordGenerators');
const { toJSON, toCSV, toSQL, exportData } = require('../../core/utils/exportUtils');
const { makeRequest, sendData } = require('../../core/utils/apiUtils');

/**
 * Generate mock data from a schema
 * @route POST /api/generate
 * @access Private
 */
exports.generateData = async (req, res, next) => {
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

    const {
      schemaId,
      schemaData,
      count = 10,
      format = 'json',
      exportOptions = {},
      saveHistory = true,
      apiDestination
    } = req.body;

    // Initialize history tracking
    const historyData = {
      owner: req.user._id,
      config: {
        count,
        format,
        exportOptions
      },
      status: 'pending',
      statistics: {
        startTime: Date.now()
      }
    };

    let schema;
    
    // Get schema - either from database or from request body
    if (schemaId) {
      schema = await Schema.findById(schemaId);
      
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
      
      // Convert schema to internal format
      schema = schema.toInternalSchema();
      historyData.schema = schemaId;
    } else if (schemaData) {
      // Use provided schema data
      schema = schemaData;
    } else {
      return res.status(400).json({
        error: true,
        message: 'Either schemaId or schemaData must be provided'
      });
    }

    try {
      // Generate mock data
      const startTime = Date.now();
      const records = await generateRecords(schema, { count });
      const generationTime = Date.now() - startTime;
      
      // Update history statistics
      historyData.statistics.recordCount = records.length;
      historyData.statistics.generationTime = generationTime;
      
      let result;
      let apiResponse = null;
      
      // Handle API destination if provided
      if (apiDestination && apiDestination.url) {
        historyData.apiDestination = {
          url: apiDestination.url,
          method: apiDestination.method || 'POST',
          batchSize: apiDestination.batchSize
        };
        
        try {
          // Send data to API
          const sendStartTime = Date.now();
          apiResponse = await sendData(records, apiDestination);
          const sendTime = Date.now() - sendStartTime;
          
          // Update history
          historyData.status = 'completed';
          historyData.statistics.apiSendTime = sendTime;
          historyData.statistics.apiStatusCode = apiResponse.status || null;
          
          // Format result for response
          result = {
            apiResponse: {
              status: apiResponse.status,
              statusText: apiResponse.statusText,
              data: apiResponse.data,
              headers: apiResponse.headers
            },
            recordCount: records.length
          };
        } catch (error) {
          // Handle API error
          historyData.status = 'failed';
          historyData.error = {
            message: error.message,
            code: error.code,
            response: error.response ? {
              status: error.response.status,
              data: error.response.data
            } : null
          };
          
          // Return error with partial data
          return res.status(200).json({
            error: true,
            message: 'API request failed',
            details: error.message,
            data: {
              records: records.slice(0, 5), // Return only first few records
              apiError: {
                message: error.message,
                code: error.code,
                response: error.response ? {
                  status: error.response.status,
                  data: error.response.data
                } : null
              }
            }
          });
        }
      } else {
        // Export data in requested format
        const exportStartTime = Date.now();
        const exported = exportData(records, format, exportOptions);
        const exportTime = Date.now() - exportStartTime;
        
        // Update history
        historyData.status = 'completed';
        historyData.statistics.exportTime = exportTime;
        historyData.statistics.exportFormat = format;
        
        // Format result for response
        result = {
          data: exported,
          format,
          recordCount: records.length
        };
      }
      
      // Save history if requested
      historyData.statistics.endTime = Date.now();
      historyData.statistics.totalTime = 
        historyData.statistics.endTime - historyData.statistics.startTime;
      
      if (saveHistory) {
        const history = new History(historyData);
        await history.save();
      }
      
      // Return success response
      return res.status(200).json({
        error: false,
        message: 'Data generated successfully',
        data: result
      });
    } catch (error) {
      // Update history on error
      historyData.status = 'failed';
      historyData.error = {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
      historyData.statistics.endTime = Date.now();
      
      // Save error history if requested
      if (saveHistory) {
        const history = new History(historyData);
        await history.save();
      }
      
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a sample record from a schema
 * @route POST /api/generate/sample
 * @access Private
 */
exports.generateSample = async (req, res, next) => {
  try {
    const {
      schemaId,
      schemaData,
      format = 'json'
    } = req.body;

    let schema;
    
    // Get schema - either from database or from request body
    if (schemaId) {
      schema = await Schema.findById(schemaId);
      
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
      
      // Convert schema to internal format
      schema = schema.toInternalSchema();
    } else if (schemaData) {
      // Use provided schema data
      schema = schemaData;
    } else {
      return res.status(400).json({
        error: true,
        message: 'Either schemaId or schemaData must be provided'
      });
    }

    try {
      // Generate a single record
      const record = generateRecord(schema);
      
      // Format the record based on requested format
      let result;
      
      switch (format.toLowerCase()) {
        case 'json':
          result = record;
          break;
        case 'csv':
          result = toCSV([record]);
          break;
        case 'sql':
          result = toSQL([record], { tableName: schema.title || 'sample' });
          break;
        default:
          result = record;
      }
      
      return res.status(200).json({
        error: false,
        message: 'Sample generated successfully',
        data: {
          sample: result,
          format
        }
      });
    } catch (error) {
      return res.status(400).json({
        error: true,
        message: 'Failed to generate sample',
        details: error.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Test API endpoint with a sample record
 * @route POST /api/generate/test-api
 * @access Private
 */
exports.testApiEndpoint = async (req, res, next) => {
  try {
    const {
      schemaId,
      schemaData,
      apiConfig
    } = req.body;

    // Validate API config
    if (!apiConfig || !apiConfig.url) {
      return res.status(400).json({
        error: true,
        message: 'API configuration with URL is required'
      });
    }

    let schema;
    
    // Get schema - either from database or from request body
    if (schemaId) {
      schema = await Schema.findById(schemaId);
      
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
      
      // Convert schema to internal format
      schema = schema.toInternalSchema();
    } else if (schemaData) {
      // Use provided schema data
      schema = schemaData;
    } else {
      return res.status(400).json({
        error: true,
        message: 'Either schemaId or schemaData must be provided'
      });
    }

    try {
      // Generate a single record
      const record = generateRecord(schema);
      
      // Configure API request
      const { url, method = 'POST', headers = {}, queryParams = {} } = apiConfig;
      
      // Test API endpoint
      const response = await makeRequest({
        url,
        method,
        headers,
        params: queryParams,
        data: record
      });
      
      return res.status(200).json({
        error: false,
        message: 'API test successful',
        data: {
          request: {
            url,
            method,
            headers,
            data: record
          },
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data
          }
        }
      });
    } catch (error) {
      return res.status(200).json({
        error: true,
        message: 'API test failed',
        details: error.message,
        data: {
          request: {
            url: apiConfig.url,
            method: apiConfig.method || 'POST'
          },
          error: {
            message: error.message,
            code: error.code,
            response: error.response ? {
              status: error.response.status,
              data: error.response.data
            } : null
          }
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get generation history for the user
 * @route GET /api/generate/history
 * @access Private
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status,
      schemaId
    } = req.query;

    // Build query
    const query = { owner: req.user._id };
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by schema
    if (schemaId) {
      query.schema = schemaId;
    }
    
    // Pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Execute query
    const history = await History.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('schema', 'title');
    
    // Get total count
    const total = await History.countDocuments(query);

    res.status(200).json({
      error: false,
      data: {
        history: history.map(item => ({
          id: item._id,
          schema: item.schema ? {
            id: item.schema._id,
            title: item.schema.title
          } : null,
          status: item.status,
          config: item.config,
          statistics: item.statistics,
          createdAt: item.createdAt,
          error: item.error
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
 * Get user statistics
 * @route GET /api/generate/stats
 * @access Private
 */
exports.getStatistics = async (req, res, next) => {
  try {
    // Get statistics for user
    const stats = await History.getUserStatistics(req.user._id);
    
    res.status(200).json({
      error: false,
      data: {
        statistics: stats
      }
    });
  } catch (error) {
    next(error);
  }
};
