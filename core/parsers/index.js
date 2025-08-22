/**
 * Schema parsers module
 * Entry point that exports all schema parsers
 */

const jsonSchemaParser = require('./jsonSchemaParser');
const mongooseParser = require('./mongooseParser');
const sqlParser = require('./sqlParser');
const typescriptParser = require('./typescriptParser');

module.exports = {
  parseJsonSchema: jsonSchemaParser.parse,
  parseMongooseSchema: mongooseParser.parse,
  parseSqlSchema: sqlParser.parse,
  parseTypescriptModel: typescriptParser.parse,
  
  // Main parse method that attempts to detect schema format and parse accordingly
  parseSchema: (schemaInput, options = {}) => {
    const { format } = options;
    
    if (format) {
      switch (format.toLowerCase()) {
        case 'json':
        case 'jsonschema':
          return jsonSchemaParser.parse(schemaInput, options);
        case 'mongoose':
          return mongooseParser.parse(schemaInput, options);
        case 'sql':
          return sqlParser.parse(schemaInput, options);
        case 'typescript':
        case 'ts':
          return typescriptParser.parse(schemaInput, options);
        default:
          throw new Error(`Unsupported schema format: ${format}`);
      }
    }
    
    // Try to auto-detect schema format
    try {
      // If it's a string but can be parsed as JSON, try JSON Schema parser
      if (typeof schemaInput === 'string') {
        try {
          const parsed = JSON.parse(schemaInput);
          return jsonSchemaParser.parse(parsed, options);
        } catch (e) {
          // Not JSON, check if it's SQL
          if (schemaInput.toLowerCase().includes('create table')) {
            return sqlParser.parse(schemaInput, options);
          }
          // Check if it's TypeScript
          else if (schemaInput.includes('interface') || schemaInput.includes('class')) {
            return typescriptParser.parse(schemaInput, options);
          }
        }
      }
      // If it's an object with schema properties, assume mongoose
      else if (schemaInput && typeof schemaInput === 'object' && schemaInput.paths) {
        return mongooseParser.parse(schemaInput, options);
      }
      // Default to JSON Schema parser for objects
      else if (schemaInput && typeof schemaInput === 'object') {
        return jsonSchemaParser.parse(schemaInput, options);
      }
      
      throw new Error('Could not detect schema format. Please specify format in options.');
    } catch (error) {
      throw new Error(`Failed to parse schema: ${error.message}`);
    }
  }
};
