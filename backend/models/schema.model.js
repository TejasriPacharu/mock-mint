/**
 * Schema Model
 * Defines the MongoDB schema for user-created schemas
 */

const mongoose = require('mongoose');

// Field schema definition for nested fields
const fieldSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Field name is required'],
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Field type is required'],
    enum: [
      'string', 'number', 'boolean', 'array', 'object', 
      'date', 'email', 'url', 'uuid', 'id',
      'firstName', 'lastName', 'fullName', 'username', 'gender',
      'age', 'phone', 'address', 'city', 'country', 'zipCode',
      'company', 'jobTitle', 'department',
      'paragraph', 'sentence', 'word',
      'image', 'color', 'ipv4', 'ipv6', 'mac',
      'filename', 'mimeType', 'fileSize',
      'creditCardNumber', 'creditCardCVV', 'currency',
      'product', 'price', 'category'
    ]
  },
  description: {
    type: String,
    trim: true
  },
  required: {
    type: Boolean,
    default: false
  },
  unique: {
    type: Boolean,
    default: false
  },
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // For nested fields (if type is 'object')
  fields: [
    {
      type: mongoose.Schema.Types.Mixed,
      default: undefined
    }
  ],
  // For array item definition (if type is 'array')
  items: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  }
}, { _id: false });

const schemaSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Schema name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Owner is required']
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  tags: [{
    type: String,
    trim: true
  }],
  fields: [fieldSchema],
  examples: [{
    type: mongoose.Schema.Types.Mixed
  }],
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  originalFormat: {
    type: String,
    enum: ['json', 'mongoose', 'sql', 'typescript', 'custom', null],
    default: null
  },
  originalSchema: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for field count
schemaSchema.virtual('fieldCount').get(function() {
  return this.fields ? this.fields.length : 0;
});

// Virtual for example count
schemaSchema.virtual('exampleCount').get(function() {
  return this.examples ? this.examples.length : 0;
});

// Index for faster searches
schemaSchema.index({ name: 'text', description: 'text', tags: 'text' });
schemaSchema.index({ owner: 1 });
schemaSchema.index({ isPublic: 1 });
schemaSchema.index({ createdAt: -1 });

const Schema = mongoose.model('Schema', schemaSchema);

module.exports = Schema;
