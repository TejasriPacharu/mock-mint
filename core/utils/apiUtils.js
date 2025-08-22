/**
 * API Utility Functions
 * Provides functions for interacting with external APIs
 */

const axios = require('axios');
const _ = require('lodash');

/**
 * Make a request to an API endpoint
 * @param {Object} options - Request options
 * @param {String} options.url - API endpoint URL
 * @param {String} options.method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} options.data - Request payload
 * @param {Object} options.headers - Request headers
 * @param {Object} options.params - URL parameters
 * @param {Number} options.timeout - Request timeout in milliseconds
 * @returns {Promise} Promise resolving to API response
 */
async function makeRequest(options) {
  const {
    url,
    method = 'GET',
    data = null,
    headers = {},
    params = {},
    timeout = 10000, // 10 seconds default timeout
    responseType = 'json',
    validateStatus = null
  } = options;

  if (!url) {
    throw new Error('URL is required for API request');
  }

  try {
    const response = await axios({
      url,
      method: method.toUpperCase(),
      data,
      headers,
      params,
      timeout,
      responseType,
      validateStatus
    });

    return {
      success: true,
      status: response.status,
      statusText: response.statusText,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      return {
        success: false,
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        success: false,
        error: 'No response received',
        request: error.request
      };
    } else {
      // Something happened in setting up the request that triggered an Error
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Send generated data to an API endpoint
 * @param {Object|Array} data - Data to send
 * @param {Object} options - API options
 * @returns {Promise} Promise resolving to API response
 */
async function sendData(data, options) {
  const {
    url,
    method = 'POST',
    headers = {},
    batchSize = 0,
    transformRequest = null
  } = options;

  if (!url) {
    throw new Error('URL is required for sending data');
  }

  // Set default headers if not provided
  const requestHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  // Handle batch sending if batchSize is specified and data is an array
  if (batchSize > 0 && Array.isArray(data) && data.length > batchSize) {
    const batches = [];
    for (let i = 0; i < data.length; i += batchSize) {
      const batchData = data.slice(i, i + batchSize);
      batches.push(batchData);
    }

    const results = [];
    for (let i = 0; i < batches.length; i++) {
      const batchData = batches[i];
      const transformedData = transformRequest 
        ? transformRequest(batchData) 
        : batchData;

      const result = await makeRequest({
        url,
        method,
        data: transformedData,
        headers: requestHeaders
      });

      results.push(result);
    }

    return {
      success: results.every(result => result.success),
      batchResults: results,
      totalBatches: batches.length,
      totalRecords: data.length
    };
  } else {
    // Send all data in one request
    const transformedData = transformRequest 
      ? transformRequest(data) 
      : data;

    return makeRequest({
      url,
      method,
      data: transformedData,
      headers: requestHeaders
    });
  }
}

/**
 * Test an API connection
 * @param {Object} options - API options
 * @returns {Promise} Promise resolving to connection test result
 */
async function testConnection(options) {
  const {
    url,
    method = 'GET',
    headers = {},
    timeout = 5000,
    testData = {}
  } = options;

  if (!url) {
    throw new Error('URL is required for testing connection');
  }

  try {
    const startTime = Date.now();
    
    const result = await makeRequest({
      url,
      method,
      data: method !== 'GET' ? testData : null,
      headers,
      timeout,
      validateStatus: () => true // Allow any status code for testing
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    return {
      success: result.status >= 200 && result.status < 300,
      available: true,
      status: result.status,
      statusText: result.statusText,
      responseTime,
      message: `Connection ${result.status >= 200 && result.status < 300 ? 'successful' : 'failed'} (${responseTime}ms)`
    };
  } catch (error) {
    return {
      success: false,
      available: false,
      error: error.message,
      message: `Connection failed: ${error.message}`
    };
  }
}

/**
 * Create a configured API client with preset options
 * @param {Object} defaultOptions - Default options for all requests
 * @returns {Object} API client with request methods
 */
function createApiClient(defaultOptions = {}) {
  const client = {
    async get(url, options = {}) {
      return makeRequest({
        ...defaultOptions,
        ...options,
        url,
        method: 'GET'
      });
    },

    async post(url, data, options = {}) {
      return makeRequest({
        ...defaultOptions,
        ...options,
        url,
        method: 'POST',
        data
      });
    },

    async put(url, data, options = {}) {
      return makeRequest({
        ...defaultOptions,
        ...options,
        url,
        method: 'PUT',
        data
      });
    },

    async patch(url, data, options = {}) {
      return makeRequest({
        ...defaultOptions,
        ...options,
        url,
        method: 'PATCH',
        data
      });
    },

    async delete(url, options = {}) {
      return makeRequest({
        ...defaultOptions,
        ...options,
        url,
        method: 'DELETE'
      });
    },

    async sendData(url, data, options = {}) {
      return sendData(data, {
        ...defaultOptions,
        ...options,
        url
      });
    },

    async testConnection(url, options = {}) {
      return testConnection({
        ...defaultOptions,
        ...options,
        url
      });
    }
  };

  return client;
}

module.exports = {
  makeRequest,
  sendData,
  testConnection,
  createApiClient
};
