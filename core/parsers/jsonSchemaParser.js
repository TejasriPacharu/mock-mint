/**
 * JSON Schema Parser
 * Parses JSON Schema format into our internal schema representation
 */

const _ = require('lodash');

/**
 * Map JSON Schema types to our internal types
 */
const typeMapping = {
  'string': 'string',
  'number': 'number',
  'integer': 'integer',
  'boolean': 'boolean',
  'object': 'object',
  'array': 'array',
  'null': 'null'
};

/**
 * Map JSON Schema formats to our internal formats
 */
const formatMapping = {
  'email': 'email',
  'uri': 'url',
  'url': 'url',
  'uuid': 'uuid',
  'date': 'date',
  'date-time': 'datetime',
  'phone': 'phone'
};

/**
 * Parse a JSON Schema property into our internal field definition
 * @param {string} name - Field name
 * @param {object} property - JSON Schema property definition
 * @returns {object} Internal field definition
 */
function parseProperty(name, property) {
  const fieldDef = {
    name,
    type: typeMapping[property.type] || 'string'
  };

  // Handle format if specified
  if (property.format) {
    fieldDef.format = formatMapping[property.format] || property.format;
  }

  // Handle constraints
  if (property.minimum !== undefined) fieldDef.min = property.minimum;
  if (property.maximum !== undefined) fieldDef.max = property.maximum;
  if (property.minLength !== undefined) fieldDef.min = property.minLength;
  if (property.maxLength !== undefined) fieldDef.max = property.maxLength;
  if (property.pattern) fieldDef.pattern = property.pattern;
  if (property.enum) fieldDef.values = property.enum;
  
  // Handle array items
  if (property.type === 'array' && property.items) {
    fieldDef.items = {
      type: typeMapping[property.items.type] || 'string'
    };
    
    // Add item constraints
    if (property.items.format) {
      fieldDef.items.format = formatMapping[property.items.format] || property.items.format;
    }
    
    // Handle nested object in array
    if (property.items.type === 'object' && property.items.properties) {
      fieldDef.items.properties = parseProperties(property.items.properties);
    }
    
    // Handle array constraints
    if (property.minItems !== undefined) fieldDef.minItems = property.minItems;
    if (property.maxItems !== undefined) fieldDef.maxItems = property.maxItems;
  }
  
  // Handle nested objects
  if (property.type === 'object' && property.properties) {
    fieldDef.properties = parseProperties(property.properties);
  }

  return fieldDef;
}

/**
 * Parse JSON Schema properties into internal field definitions
 * @param {object} properties - JSON Schema properties object
 * @returns {object} Map of field definitions by name
 */
function parseProperties(properties) {
  const fields = {};
  
  Object.entries(properties).forEach(([name, prop]) => {
    fields[name] = parseProperty(name, prop);
  });
  
  return fields;
}

/**
 * Parse a JSON Schema document into our internal schema format
 * @param {object|string} schema - JSON Schema document or string
 * @param {object} options - Parser options
 * @returns {object} Internal schema representation
 */
function parse(schema, options = {}) {
  try {
    // Parse string to object if needed
    const schemaObj = typeof schema === 'string' ? JSON.parse(schema) : schema;
    
    // Basic validation
    if (!schemaObj || typeof schemaObj !== 'object') {
      throw new Error('Invalid JSON Schema: must be an object');
    }
    
    const result = {
      title: schemaObj.title || options.title || 'Untitled Schema',
      type: 'object',
      fields: {}
    };
    
    // Handle top-level schema (may be definitions only)
    if (schemaObj.properties) {
      result.fields = parseProperties(schemaObj.properties);
    } 
    // Handle schema with only type and no properties
    else if (schemaObj.type && !schemaObj.properties) {
      result.type = typeMapping[schemaObj.type] || 'object';
    }
    
    // Handle definitions/components section (JSON Schema draft-07 or OpenAPI style)
    if (schemaObj.definitions) {
      result.definitions = {};
      Object.entries(schemaObj.definitions).forEach(([name, def]) => {
        if (def.properties) {
          result.definitions[name] = {
            fields: parseProperties(def.properties)
          };
        }
      });
    } else if (schemaObj.components && schemaObj.components.schemas) {
      result.definitions = {};
      Object.entries(schemaObj.components.schemas).forEach(([name, def]) => {
        if (def.properties) {
          result.definitions[name] = {
            fields: parseProperties(def.properties)
          };
        }
      });
    }
    
    // Handle required fields
    if (schemaObj.required && Array.isArray(schemaObj.required)) {
      schemaObj.required.forEach(fieldName => {
        if (result.fields[fieldName]) {
          result.fields[fieldName].required = true;
        }
      });
    }
    
    return result;
  } catch (error) {
    throw new Error(`JSON Schema parsing error: ${error.message}`);
  }
}

module.exports = {
  parse
};
