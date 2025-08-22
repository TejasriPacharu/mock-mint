/**
 * SQL Schema Parser
 * Parses SQL CREATE TABLE statements into our internal schema format
 */

/**
 * Map SQL data types to our internal types
 */
const typeMapping = {
  // String types
  'varchar': 'string',
  'char': 'string',
  'text': 'string',
  'longtext': 'string',
  'mediumtext': 'string',
  'tinytext': 'string',
  'nvarchar': 'string',
  'nchar': 'string',
  'ntext': 'string',
  
  // Number types
  'int': 'integer',
  'integer': 'integer',
  'smallint': 'integer',
  'tinyint': 'integer',
  'mediumint': 'integer',
  'bigint': 'integer',
  'float': 'number',
  'double': 'number',
  'decimal': 'number',
  'numeric': 'number',
  'real': 'number',
  
  // Boolean types
  'boolean': 'boolean',
  'bool': 'boolean',
  'bit': 'boolean',
  
  // Date types
  'date': 'date',
  'datetime': 'datetime',
  'timestamp': 'datetime',
  'time': 'string',
  'year': 'integer',
  
  // Binary types
  'blob': 'string',
  'binary': 'string',
  'varbinary': 'string',
  'longblob': 'string',
  'mediumblob': 'string',
  'tinyblob': 'string',
  
  // JSON types
  'json': 'object',
  'jsonb': 'object',
  
  // Other types
  'uuid': 'string',
  'enum': 'enum',
  'set': 'array',
  'geometry': 'object',
  'point': 'object',
  'linestring': 'object',
  'polygon': 'object'
};

/**
 * Parse a SQL column definition into our internal field definition
 * @param {object} column - SQL column definition object
 * @returns {object} Internal field definition
 */
function parseColumn(column) {
  const { name, dataType, constraints = [] } = column;
  
  // Extract type and potential parameters
  const typeMatch = dataType.match(/^(\w+)(?:\(([^)]+)\))?/i);
  const baseType = typeMatch ? typeMatch[1].toLowerCase() : dataType.toLowerCase();
  const typeParams = typeMatch && typeMatch[2] ? typeMatch[2].split(',').map(p => p.trim()) : [];
  
  const fieldDef = {
    name,
    type: typeMapping[baseType] || 'string'
  };
  
  // Handle string length constraints
  if (fieldDef.type === 'string' && typeParams.length > 0) {
    const maxLength = parseInt(typeParams[0], 10);
    if (!isNaN(maxLength)) fieldDef.max = maxLength;
  }
  
  // Handle numeric precision/scale
  if (fieldDef.type === 'number' && typeParams.length >= 1) {
    const precision = parseInt(typeParams[0], 10);
    const scale = typeParams.length >= 2 ? parseInt(typeParams[1], 10) : 0;
    
    if (!isNaN(precision)) fieldDef.precision = precision;
    if (!isNaN(scale)) fieldDef.scale = scale;
  }
  
  // Handle enum values
  if (baseType === 'enum' && typeParams.length > 0) {
    fieldDef.type = 'enum';
    // Clean quotes from enum values
    fieldDef.values = typeParams.map(val => val.replace(/^['"]|['"]$/g, ''));
  }
  
  // Process constraints
  constraints.forEach(constraint => {
    const constraintLower = constraint.toLowerCase();
    
    if (constraintLower.includes('not null')) {
      fieldDef.required = true;
    }
    
    if (constraintLower.includes('unique')) {
      fieldDef.unique = true;
    }
    
    if (constraintLower.includes('primary key')) {
      fieldDef.primaryKey = true;
      fieldDef.required = true;
    }
    
    // Default value
    const defaultMatch = constraintLower.match(/default\s+(['"]?)(.*?)\1($|\s)/i);
    if (defaultMatch) {
      let defaultValue = defaultMatch[2];
      
      // Convert to appropriate type
      if (fieldDef.type === 'integer' || fieldDef.type === 'number') {
        defaultValue = Number(defaultValue);
      } else if (fieldDef.type === 'boolean') {
        defaultValue = defaultValue.toLowerCase() === 'true' || defaultValue === '1';
      }
      
      fieldDef.default = defaultValue;
    }
    
    // Check constraints
    const checkMatch = constraintLower.match(/check\s*\((.*?)\)/i);
    if (checkMatch) {
      const checkExpr = checkMatch[1];
      
      // Try to extract simple range constraints
      const rangeMatch = checkExpr.match(/(\w+)\s*(>=?|<=?)\s*(\d+)/);
      if (rangeMatch && rangeMatch[1].toLowerCase() === name.toLowerCase()) {
        const operator = rangeMatch[2];
        const value = Number(rangeMatch[3]);
        
        if (operator === '>=' || operator === '>') {
          fieldDef.min = value;
        } else if (operator === '<=' || operator === '<') {
          fieldDef.max = value;
        }
      }
    }
  });
  
  // Detect common formats by name
  if (fieldDef.type === 'string') {
    if (/email/i.test(name)) fieldDef.format = 'email';
    else if (/phone|mobile/i.test(name)) fieldDef.format = 'phone';
    else if (/^url$|website|link/i.test(name)) fieldDef.format = 'url';
    else if (/uuid/i.test(name) || /guid/i.test(name)) fieldDef.format = 'uuid';
  }
  
  return fieldDef;
}

/**
 * Parse a SQL CREATE TABLE statement into our internal schema format
 * @param {string} sqlStatement - SQL CREATE TABLE statement
 * @param {object} options - Parser options
 * @returns {object} Internal schema representation
 */
function parse(sqlStatement, options = {}) {
  try {
    if (typeof sqlStatement !== 'string') {
      throw new Error('SQL statement must be a string');
    }
    
    // Extract table name and body
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["'`]?([^"'`]+)["'`]?)?\s*\(([\s\S]+?)\)\s*(?:;|$)/i;
    const tableMatch = sqlStatement.match(tableRegex);
    
    if (!tableMatch) {
      throw new Error('Could not parse CREATE TABLE statement');
    }
    
    const tableName = tableMatch[1] || options.title || 'UnknownTable';
    const tableBody = tableMatch[2];
    
    // Parse columns
    const columnRegex = /([^,(]+(?:\([^)]*\))?[^,)]*)/g;
    const columns = [];
    let match;
    
    while ((match = columnRegex.exec(tableBody)) !== null) {
      const columnDef = match[1].trim();
      
      // Skip empty lines, constraints and keys that aren't column definitions
      if (!columnDef || 
          /^(?:PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT|KEY|INDEX)/i.test(columnDef)) {
        continue;
      }
      
      // Parse column name and type
      const columnRegex = /^\s*["'`]?([^"'`\s]+)["'`]?\s+([^(,\s]+(?:\([^)]+\))?)[^,]*(.*)/i;
      const columnMatch = columnDef.match(columnRegex);
      
      if (columnMatch) {
        const name = columnMatch[1];
        const dataType = columnMatch[2];
        const constraintsPart = columnMatch[3];
        
        // Extract constraints
        const constraints = [];
        if (constraintsPart) {
          constraints.push(constraintsPart.trim());
        }
        
        columns.push({
          name,
          dataType,
          constraints
        });
      }
    }
    
    // Convert to our schema format
    const fields = {};
    columns.forEach(column => {
      const field = parseColumn(column);
      fields[field.name] = field;
    });
    
    return {
      title: tableName,
      type: 'object',
      fields
    };
  } catch (error) {
    throw new Error(`SQL parsing error: ${error.message}`);
  }
}

module.exports = {
  parse
};
