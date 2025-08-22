/**
 * Record generators module
 * Functions for generating multiple records based on a schema
 */

const { faker } = require('@faker-js/faker');
const { generateFieldValue } = require('./fieldGenerators');
const _ = require('lodash');

/**
 * Generate a single record based on schema
 * @param {object} schema - Schema definition with fields and types
 * @returns {object} Generated record
 */
function generateRecord(schema) {
  const record = {};
  
  // Handle simple flat schema format
  if (schema.fields) {
    Object.entries(schema.fields).forEach(([fieldName, fieldDef]) => {
      const fieldType = typeof fieldDef === 'string' ? fieldDef : fieldDef.type;
      const options = typeof fieldDef === 'string' ? {} : fieldDef;
      
      record[fieldName] = generateFieldValue(fieldType, options);
    });
  } 
  // Handle JSON Schema format
  else if (schema.properties) {
    Object.entries(schema.properties).forEach(([fieldName, fieldDef]) => {
      const fieldType = fieldDef.type || 'string';
      record[fieldName] = generateFieldValue(fieldType, fieldDef);
    });
  }
  // Handle simple array of field names
  else if (Array.isArray(schema)) {
    schema.forEach(fieldName => {
      record[fieldName] = generateFieldValue('string', {});
    });
  }
  
  return record;
}

/**
 * Generate multiple records based on a schema
 * @param {object} schema - Schema definition with fields and types
 * @param {object} options - Options for generation (count, seed, etc)
 * @returns {Array} Array of generated records
 */
function generateRecords(schema, options = {}) {
  const { count = 10, seed } = options;
  
  // Set seed if provided
  if (seed) faker.seed(seed);
  
  return Array.from({ length: count }).map(() => generateRecord(schema));
}

/**
 * Generate related records based on multiple schemas with relations
 * @param {object} schemas - Map of schema definitions by name
 * @param {Array} relations - Array of relation definitions
 * @param {object} options - Options for generation
 * @returns {object} Generated related records by schema name
 */
function generateRelatedRecords(schemas, relations = [], options = {}) {
  const generatedData = {};
  const references = {};
  
  // First pass: generate all primary records
  Object.entries(schemas).forEach(([schemaName, schema]) => {
    const schemaOptions = options[schemaName] || {};
    const records = generateRecords(schema, schemaOptions);
    
    generatedData[schemaName] = records;
    
    // Store references to IDs for relation handling
    references[schemaName] = records.map(record => record.id || faker.string.uuid());
  });
  
  // Second pass: establish relationships between records
  if (relations.length > 0) {
    relations.forEach(relation => {
      const { from, to, type, foreignKey } = relation;
      
      if (type === 'one-to-many') {
        // For each parent record, assign multiple child records
        generatedData[from].forEach(parentRecord => {
          // Get random number of child records
          const childCount = faker.number.int({ min: 1, max: 3 });
          const childRecords = _.sampleSize(generatedData[to], childCount);
          
          // Assign parent reference to child records
          childRecords.forEach(childRecord => {
            childRecord[foreignKey || `${from}Id`] = parentRecord.id;
          });
        });
      } else if (type === 'many-to-one') {
        // For each child record, assign one parent record
        generatedData[from].forEach(childRecord => {
          const parentRecord = faker.helpers.arrayElement(generatedData[to]);
          childRecord[foreignKey || `${to}Id`] = parentRecord.id;
        });
      }
    });
  }
  
  return generatedData;
}

/**
 * Generate data in specific format (JSON, CSV, SQL)
 * @param {Array} records - Generated records
 * @param {string} format - Output format (json, csv, sql)
 * @param {object} options - Format specific options
 * @returns {string} Formatted output
 */
function formatRecords(records, format = 'json', options = {}) {
  switch (format.toLowerCase()) {
    case 'json':
      return JSON.stringify(records, null, options.indent || 2);
      
    case 'csv':
      // Basic CSV implementation (more advanced implementation would use csv-stringify)
      const headers = Object.keys(records[0] || {});
      const rows = records.map(record => 
        headers.map(header => {
          const value = record[header];
          if (typeof value === 'object') return JSON.stringify(value);
          return value;
        }).join(',')
      );
      
      return [headers.join(','), ...rows].join('\n');
      
    default:
      return JSON.stringify(records);
  }
}

module.exports = {
  generateRecord,
  generateRecords,
  generateRelatedRecords,
  formatRecords
};
