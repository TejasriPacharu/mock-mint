/**
 * TypeScript Parser
 * Parses TypeScript interfaces and classes into our internal schema format
 */

/**
 * Map TypeScript types to our internal types
 */
const typeMapping = {
  'string': 'string',
  'number': 'number',
  'boolean': 'boolean',
  'object': 'object',
  'any': 'object',
  'Date': 'date',
  'Array': 'array',
  'Record': 'object',
  'Map': 'object'
};

/**
 * Extract interface/class definitions from TypeScript code
 * @param {string} code - TypeScript code
 * @returns {Array} Array of extracted interface/class definitions
 */
function extractDefinitions(code) {
  const definitions = [];
  
  // Extract interfaces
  const interfaceRegex = /(?:export\s+)?interface\s+(\w+)(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?{([\s\S]*?)}/g;
  let match;
  
  while ((match = interfaceRegex.exec(code)) !== null) {
    definitions.push({
      name: match[1],
      type: 'interface',
      body: match[2]
    });
  }
  
  // Extract classes
  const classRegex = /(?:export\s+)?class\s+(\w+)(?:<[^>]*>)?\s*(?:extends\s+[^{]*)?\s*(?:implements\s+[^{]*)?\s*{([\s\S]*?)(?:constructor|$)/g;
  while ((match = classRegex.exec(code)) !== null) {
    definitions.push({
      name: match[1],
      type: 'class',
      body: match[2]
    });
  }
  
  return definitions;
}

/**
 * Extract fields from TypeScript interface/class body
 * @param {string} body - Interface/class body
 * @returns {Array} Array of extracted field definitions
 */
function extractFields(body) {
  const fields = [];
  
  // Match field declarations like: name: string; or readonly age?: number;
  const fieldRegex = /(?:\s*\/\/.*\s*)*(?:\s*\/\*[\s\S]*?\*\/\s*)*\s*(readonly\s+)?(\w+)(\?)?:\s*([^;]*);/g;
  let match;
  
  while ((match = fieldRegex.exec(body)) !== null) {
    const isReadonly = Boolean(match[1]);
    const name = match[2];
    const isOptional = Boolean(match[3]);
    const typeExpression = match[4].trim();
    
    fields.push({
      name,
      typeExpression,
      isOptional,
      isReadonly
    });
  }
  
  return fields;
}

/**
 * Parse a TypeScript type expression
 * @param {string} typeExpr - TypeScript type expression
 * @returns {object} Parsed type information
 */
function parseTypeExpression(typeExpr) {
  // Handle array types like string[] or Array<string>
  if (typeExpr.endsWith('[]')) {
    const itemType = typeExpr.slice(0, -2);
    return {
      type: 'array',
      items: parseTypeExpression(itemType)
    };
  }
  
  if (typeExpr.startsWith('Array<') && typeExpr.endsWith('>')) {
    const itemType = typeExpr.slice(6, -1);
    return {
      type: 'array',
      items: parseTypeExpression(itemType)
    };
  }
  
  // Handle record types like Record<string, any>
  if (typeExpr.startsWith('Record<') && typeExpr.endsWith('>')) {
    return {
      type: 'object'
    };
  }
  
  // Handle union types like 'string | null'
  if (typeExpr.includes('|')) {
    const types = typeExpr.split('|').map(t => t.trim());
    
    // Check if it's an enum-like union of string literals
    const stringLiterals = types.filter(t => t.startsWith("'") || t.startsWith('"'));
    if (stringLiterals.length > 0 && stringLiterals.length === types.length) {
      return {
        type: 'enum',
        values: stringLiterals.map(s => s.slice(1, -1))
      };
    }
    
    // Otherwise use the first non-null, non-undefined type
    const nonNullTypes = types.filter(t => t !== 'null' && t !== 'undefined');
    if (nonNullTypes.length > 0) {
      return parseTypeExpression(nonNullTypes[0]);
    }
    
    return { type: 'string' };
  }
  
  // Handle basic types
  const baseType = typeExpr.split('<')[0].trim();
  return {
    type: typeMapping[baseType] || 'string'
  };
}

/**
 * Convert extracted fields into our internal field definitions
 * @param {Array} extractedFields - Array of extracted field objects
 * @returns {object} Map of field definitions by name
 */
function convertFields(extractedFields) {
  const fields = {};
  
  extractedFields.forEach(field => {
    const { name, typeExpression, isOptional } = field;
    
    const parsedType = parseTypeExpression(typeExpression);
    const fieldDef = {
      name,
      type: parsedType.type,
      required: !isOptional
    };
    
    // Add enum values if present
    if (parsedType.values) {
      fieldDef.values = parsedType.values;
    }
    
    // Handle array items
    if (parsedType.type === 'array' && parsedType.items) {
      fieldDef.items = {
        type: parsedType.items.type
      };
      
      // Handle array of enums
      if (parsedType.items.values) {
        fieldDef.items.values = parsedType.items.values;
      }
    }
    
    // Detect common formats by field name
    if (fieldDef.type === 'string') {
      if (/email/i.test(name)) fieldDef.format = 'email';
      else if (/phone|mobile/i.test(name)) fieldDef.format = 'phone';
      else if (/^url$|website|link/i.test(name)) fieldDef.format = 'url';
      else if (/uuid|guid/i.test(name)) fieldDef.format = 'uuid';
      else if (/date/i.test(name) && !/datetime/i.test(name)) fieldDef.format = 'date';
      else if (/datetime/i.test(name)) fieldDef.format = 'datetime';
    }
    
    fields[name] = fieldDef;
  });
  
  return fields;
}

/**
 * Parse TypeScript code into our internal schema format
 * @param {string} code - TypeScript code
 * @param {object} options - Parser options
 * @returns {object} Internal schema representation
 */
function parse(code, options = {}) {
  try {
    if (typeof code !== 'string') {
      throw new Error('TypeScript code must be a string');
    }
    
    // Extract all interface/class definitions
    const definitions = extractDefinitions(code);
    
    if (definitions.length === 0) {
      throw new Error('No TypeScript interfaces or classes found');
    }
    
    // Handle the case when a specific definition is requested
    let targetDef = definitions[0];
    if (options.name) {
      const found = definitions.find(def => def.name === options.name);
      if (found) {
        targetDef = found;
      }
    }
    
    // Extract and convert fields
    const extractedFields = extractFields(targetDef.body);
    const fields = convertFields(extractedFields);
    
    return {
      title: targetDef.name,
      type: 'object',
      fields
    };
  } catch (error) {
    throw new Error(`TypeScript parsing error: ${error.message}`);
  }
}

module.exports = {
  parse
};
