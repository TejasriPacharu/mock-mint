/**
 * Mongoose Schema Parser
 * Parses Mongoose schema definitions into our internal schema format
 */

/**
 * Map Mongoose schema types to our internal types
 */
const typeMapping = {
  'String': 'string',
  'Number': 'number',
  'Date': 'date',
  'Buffer': 'string',
  'Boolean': 'boolean',
  'Mixed': 'object',
  'ObjectId': 'string',
  'Array': 'array',
  'Map': 'object',
  'Decimal128': 'number'
};

/**
 * Parse a single Mongoose schema path into our internal field definition
 * @param {string} name - Field name
 * @param {object} path - Mongoose schema path
 * @returns {object} Internal field definition
 */
function parsePath(name, path) {
  // Handle simple path case
  if (!path || !path.instance) {
    return { name, type: 'string' };
  }

  const fieldDef = {
    name,
    type: typeMapping[path.instance] || 'string'
  };

  // Handle schema options
  if (path.options) {
    if (path.options.required) fieldDef.required = true;
    if (path.options.default !== undefined && typeof path.options.default !== 'function') {
      fieldDef.default = path.options.default;
    }
    
    // Handle string validators
    if (path.instance === 'String') {
      if (path.options.enum) fieldDef.values = path.options.enum;
      if (path.options.match) fieldDef.pattern = path.options.match.toString();
      if (path.options.minlength !== undefined) fieldDef.min = path.options.minlength;
      if (path.options.maxlength !== undefined) fieldDef.max = path.options.maxlength;
      
      // Try to detect common formats
      if (path.options.match) {
        const matchStr = path.options.match.toString();
        if (matchStr.includes('@')) fieldDef.format = 'email';
        else if (matchStr.includes('http')) fieldDef.format = 'url';
      }
      
      if (name.toLowerCase().includes('email')) fieldDef.format = 'email';
      if (name.toLowerCase().includes('phone')) fieldDef.format = 'phone';
      if (name.toLowerCase() === 'url' || name.toLowerCase().includes('website')) {
        fieldDef.format = 'url';
      }
    }
    
    // Handle number validators
    if (path.instance === 'Number') {
      if (path.options.min !== undefined) fieldDef.min = path.options.min;
      if (path.options.max !== undefined) fieldDef.max = path.options.max;
    }
  }
  
  // Handle array type
  if (path.instance === 'Array' && path.schema) {
    fieldDef.items = {
      type: 'object',
      properties: parseSchema(path.schema)
    };
  } else if (path.instance === 'Array' && path.caster) {
    fieldDef.items = {
      type: typeMapping[path.caster.instance] || 'string'
    };
  }
  
  // Handle object with sub-schema
  if (path.schema) {
    fieldDef.properties = parseSchema(path.schema);
  }
  
  return fieldDef;
}

/**
 * Parse a Mongoose schema into our internal field definitions
 * @param {object} schema - Mongoose schema
 * @returns {object} Map of field definitions by name
 */
function parseSchema(schema) {
  const fields = {};
  
  if (!schema || !schema.paths) {
    return fields;
  }
  
  // Iterate over schema paths
  Object.entries(schema.paths).forEach(([name, path]) => {
    // Skip internal mongoose fields
    if (name.startsWith('_') && name !== '_id') return;
    
    fields[name] = parsePath(name, path);
  });
  
  return fields;
}

/**
 * Parse a Mongoose schema or model into our internal schema format
 * @param {object} schemaOrModel - Mongoose schema or model
 * @param {object} options - Parser options
 * @returns {object} Internal schema representation
 */
function parse(schemaOrModel, options = {}) {
  try {
    // Handle case when a model is passed instead of schema
    const schema = schemaOrModel.schema || schemaOrModel;
    
    if (!schema || typeof schema !== 'object') {
      throw new Error('Invalid Mongoose schema: must be a schema or model object');
    }
    
    const result = {
      title: options.title || schema.options?.collection || 'Untitled Schema',
      type: 'object',
      fields: parseSchema(schema)
    };
    
    return result;
  } catch (error) {
    throw new Error(`Mongoose schema parsing error: ${error.message}`);
  }
}

module.exports = {
  parse
};
