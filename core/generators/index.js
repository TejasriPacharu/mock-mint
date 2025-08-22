/**
 * Mock data generators module
 * Provides functions for generating mock data based on field types
 */

const fieldGenerators = require('./fieldGenerators');
const recordGenerators = require('./recordGenerators');

module.exports = {
  ...fieldGenerators,
  ...recordGenerators,
  generateData: recordGenerators.generateRecords
};
