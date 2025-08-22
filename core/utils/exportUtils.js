/**
 * Export Utility Functions
 * Provides functions for exporting generated data in various formats
 */

const { stringify } = require('csv-stringify/sync');
const path = require('path');
const _ = require('lodash');

/**
 * Export data to JSON format
 * @param {Array|Object} data - Data to export
 * @param {Object} options - Export options
 * @returns {String} JSON string
 */
function toJSON(data, options = {}) {
  const { pretty = true, indent = 2 } = options;
  
  return pretty 
    ? JSON.stringify(data, null, indent)
    : JSON.stringify(data);
}

/**
 * Export data to CSV format
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @returns {String} CSV string
 */
function toCSV(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const { 
    header = true,
    columns,
    delimiter = ',',
    quoted = true,
    escapeQuotes = true
  } = options;

  // Define stringify options
  const stringifyOptions = {
    header,
    delimiter,
    quoted,
    escape: escapeQuotes
  };

  // If columns are specified, use them
  if (columns && Array.isArray(columns)) {
    stringifyOptions.columns = columns;
  }

  try {
    return stringify(data, stringifyOptions);
  } catch (error) {
    throw new Error(`CSV export error: ${error.message}`);
  }
}

/**
 * Export data to SQL INSERT statements
 * @param {Array} data - Array of objects to export
 * @param {Object} options - Export options
 * @returns {String} SQL INSERT statements
 */
function toSQL(data, options = {}) {
  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  const { 
    tableName = 'table',
    schema = 'public',
    dialect = 'postgresql', // 'postgresql', 'mysql', 'sqlite'
    dropTable = false,
    createTable = false
  } = options;

  // Normalize table name for SQL
  const tableIdentifier = dialect === 'mysql' 
    ? `\`${tableName}\`` 
    : `"${schema}"."${tableName}"`;

  let sql = '';
  
  // Add DROP TABLE statement if requested
  if (dropTable) {
    sql += `DROP TABLE IF EXISTS ${tableIdentifier};\n\n`;
  }
  
  // Add CREATE TABLE statement if requested
  if (createTable) {
    const sample = data[0];
    const columns = [];
    
    Object.entries(sample).forEach(([key, value]) => {
      let columnType;
      
      // Infer SQL type from value type
      switch (typeof value) {
        case 'number':
          columnType = Number.isInteger(value) ? 'INTEGER' : 'NUMERIC';
          break;
        case 'boolean':
          columnType = dialect === 'mysql' ? 'TINYINT(1)' : 'BOOLEAN';
          break;
        case 'object':
          if (value === null) {
            columnType = 'TEXT';
          } else if (value instanceof Date) {
            columnType = 'TIMESTAMP';
          } else {
            columnType = dialect === 'postgresql' ? 'JSONB' : 'JSON';
          }
          break;
        default:
          columnType = 'TEXT';
      }
      
      const columnName = dialect === 'mysql' ? `\`${key}\`` : `"${key}"`;
      columns.push(`${columnName} ${columnType}`);
    });
    
    sql += `CREATE TABLE ${tableIdentifier} (\n  ${columns.join(',\n  ')}\n);\n\n`;
  }
  
  // Generate INSERT statements
  data.forEach(row => {
    const columns = Object.keys(row);
    const columnsList = columns.map(col => 
      dialect === 'mysql' ? `\`${col}\`` : `"${col}"`
    ).join(', ');
    
    const valuesList = columns.map(col => formatSqlValue(row[col], dialect)).join(', ');
    
    sql += `INSERT INTO ${tableIdentifier} (${columnsList}) VALUES (${valuesList});\n`;
  });
  
  return sql;
}

/**
 * Format a JavaScript value for SQL insertion
 * @param {*} value - Value to format
 * @param {string} dialect - SQL dialect
 * @returns {string} SQL formatted value
 */
function formatSqlValue(value, dialect = 'postgresql') {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  
  switch (typeof value) {
    case 'string':
      // Escape single quotes
      const escaped = value.replace(/'/g, "''");
      return `'${escaped}'`;
    
    case 'number':
      return value.toString();
    
    case 'boolean':
      if (dialect === 'mysql') {
        return value ? '1' : '0';
      }
      return value ? 'TRUE' : 'FALSE';
    
    case 'object':
      if (value instanceof Date) {
        return `'${value.toISOString()}'`;
      }
      // Convert objects to JSON strings
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    
    default:
      return `'${value}'`;
  }
}

/**
 * Determine the appropriate export format based on file extension
 * @param {string} filePath - Path to the file
 * @returns {string} Export format (json, csv, sql)
 */
function getFormatFromFilename(filePath) {
  if (!filePath) return 'json';
  
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.csv':
      return 'csv';
    case '.sql':
      return 'sql';
    case '.json':
    default:
      return 'json';
  }
}

/**
 * Export data to a specific format
 * @param {Array|Object} data - Data to export
 * @param {string} format - Export format (json, csv, sql)
 * @param {Object} options - Export options
 * @returns {string} Formatted data as string
 */
function exportData(data, format = 'json', options = {}) {
  switch (format.toLowerCase()) {
    case 'csv':
      return toCSV(data, options);
    case 'sql':
      return toSQL(data, options);
    case 'json':
    default:
      return toJSON(data, options);
  }
}

module.exports = {
  toJSON,
  toCSV,
  toSQL,
  getFormatFromFilename,
  exportData
};
