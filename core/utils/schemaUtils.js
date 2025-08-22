/**
 * Schema Utility Functions
 * Provides functions for validating and manipulating schemas
 */

const Joi = require('joi');
const _ = require('lodash');

/**
 * Basic schema structure validation using Joi
 */
const schemaStructureSchema = Joi.object({
  title: Joi.string(),
  type: Joi.string().valid('object', 'array').default('object'),
  fields: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      type: Joi.string().required(),
      name: Joi.string(),
      format: Joi.string(),
      required: Joi.boolean(),
      min: Joi.number(),
      max: Joi.number(),
      pattern: Joi.string(),
      values: Joi.array(),
      items: Joi.object(),
      properties: Joi.object()
    })
  )
});

/**
 * Validate a schema object against the basic schema structure
 * @param {object} schema - Schema to validate
 * @returns {object} Validation result {isValid, error}
 */
function validateSchema(schema) {
  const result = schemaStructureSchema.validate(schema);
  return {
    isValid: !result.error,
    error: result.error ? result.error.message : null
  };
}

/**
 * Merge multiple schemas into one
 * @param {...object} schemas - Schemas to merge
 * @returns {object} Merged schema
 */
function mergeSchemas(...schemas) {
  // Filter out empty schemas
  const validSchemas = schemas.filter(s => s && typeof s === 'object');
  
  if (validSchemas.length === 0) {
    return { title: 'Empty Schema', type: 'object', fields: {} };
  }
  
  if (validSchemas.length === 1) {
    return validSchemas[0];
  }
  
  // Start with the first schema
  const baseSchema = { ...validSchemas[0] };
  
  // Merge in additional schemas
  for (let i = 1; i < validSchemas.length; i++) {
    const schema = validSchemas[i];
    
    // Merge fields
    baseSchema.fields = {
      ...baseSchema.fields,
      ...schema.fields
    };
    
    // Merge definitions if they exist
    if (schema.definitions) {
      baseSchema.definitions = {
        ...baseSchema.definitions,
        ...schema.definitions
      };
    }
  }
  
  return baseSchema;
}

/**
 * Convert internal schema to JSON Schema format
 * @param {object} schema - Internal schema representation
 * @returns {object} JSON Schema format
 */
function toJsonSchema(schema) {
  if (!schema || !schema.fields) {
    return {
      type: 'object',
      properties: {}
    };
  }
  
  const result = {
    type: 'object',
    title: schema.title,
    properties: {},
    required: []
  };
  
  // Process fields
  Object.entries(schema.fields).forEach(([name, field]) => {
    const property = {
      type: field.type
    };
    
    // Add format if present
    if (field.format) {
      property.format = field.format;
    }
    
    // Add constraints
    if (field.min !== undefined) {
      if (['string'].includes(field.type)) {
        property.minLength = field.min;
      } else if (['number', 'integer'].includes(field.type)) {
        property.minimum = field.min;
      } else if (field.type === 'array') {
        property.minItems = field.min;
      }
    }
    
    if (field.max !== undefined) {
      if (['string'].includes(field.type)) {
        property.maxLength = field.max;
      } else if (['number', 'integer'].includes(field.type)) {
        property.maximum = field.max;
      } else if (field.type === 'array') {
        property.maxItems = field.max;
      }
    }
    
    // Add pattern
    if (field.pattern) {
      property.pattern = field.pattern;
    }
    
    // Handle enum values
    if (field.values) {
      property.enum = field.values;
    }
    
    // Handle array items
    if (field.type === 'array' && field.items) {
      property.items = {
        type: field.items.type || 'string'
      };
      
      // Add nested object properties
      if (field.items.properties) {
        const nestedSchema = {
          fields: field.items.properties
        };
        const jsonSchema = toJsonSchema(nestedSchema);
        property.items = {
          ...property.items,
          ...jsonSchema
        };
      }
    }
    
    // Handle nested objects
    if (field.type === 'object' && field.properties) {
      const nestedSchema = {
        fields: field.properties
      };
      const jsonSchema = toJsonSchema(nestedSchema);
      property.properties = jsonSchema.properties;
      
      if (jsonSchema.required && jsonSchema.required.length > 0) {
        property.required = jsonSchema.required;
      }
    }
    
    // Add required fields
    if (field.required) {
      result.required.push(name);
    }
    
    result.properties[name] = property;
  });
  
  // Remove required array if empty
  if (result.required.length === 0) {
    delete result.required;
  }
  
  return result;
}

/**
 * Extract a subset of fields from a schema
 * @param {object} schema - Source schema
 * @param {Array} fieldNames - Field names to include
 * @returns {object} New schema with only the specified fields
 */
function extractFields(schema, fieldNames) {
  if (!schema || !schema.fields || !Array.isArray(fieldNames)) {
    return schema;
  }
  
  const extractedSchema = {
    title: schema.title,
    type: schema.type,
    fields: {}
  };
  
  fieldNames.forEach(fieldName => {
    if (schema.fields[fieldName]) {
      extractedSchema.fields[fieldName] = schema.fields[fieldName];
    }
  });
  
  return extractedSchema;
}

/**
 * Add default values for common fields based on field name and type
 * @param {object} schema - Schema to enhance
 * @returns {object} Enhanced schema with default values
 */
function enhanceSchema(schema) {
  if (!schema || !schema.fields) {
    return schema;
  }
  
  const enhancedSchema = {
    ...schema,
    fields: { ...schema.fields }
  };
  
  Object.entries(enhancedSchema.fields).forEach(([name, field]) => {
    // Add format by field name conventions if not already set
    if (!field.format && field.type === 'string') {
      const nameLower = name.toLowerCase();
      
      if (/email/.test(nameLower)) {
        field.format = 'email';
      } else if (/phone|mobile|tel/.test(nameLower)) {
        field.format = 'phone';
      } else if (/url|website|link/.test(nameLower)) {
        field.format = 'url';
      } else if (/uuid|guid/.test(nameLower)) {
        field.format = 'uuid';
      } else if (/date/.test(nameLower) && !/datetime|time/.test(nameLower)) {
        field.format = 'date';
      } else if (/datetime/.test(nameLower)) {
        field.format = 'datetime';
      } else if (/password/.test(nameLower)) {
        field.format = 'password';
      }
    }
    
    // Add reasonable constraints for common field types
    if (field.type === 'string' && !field.min && !field.max) {
      if (field.format === 'email') {
        field.min = 5;
        field.max = 255;
      } else if (field.format === 'url') {
        field.min = 10;
        field.max = 2083;
      } else if (field.format === 'phone') {
        field.min = 7;
        field.max = 20;
      } else if (name.toLowerCase().includes('name')) {
        field.min = 2;
        field.max = 100;
      } else if (name.toLowerCase().includes('description')) {
        field.min = 10;
        field.max = 1000;
      }
    }
  });
  
  return enhancedSchema;
}

module.exports = {
  validateSchema,
  mergeSchemas,
  toJsonSchema,
  extractFields,
  enhanceSchema
};
