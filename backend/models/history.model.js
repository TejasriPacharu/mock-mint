/**
 * History Model
 * Tracks data generation jobs and statistics
 */

const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required']
  },
  schema: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schema',
    required: [true, 'Schema is required']
  },
  schemaVersion: {
    type: String
  },
  schemaSnapshot: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Schema snapshot is required']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  options: {
    recordCount: {
      type: Number,
      required: [true, 'Record count is required']
    },
    format: {
      type: String,
      enum: ['json', 'csv', 'sql'],
      default: 'json'
    },
    exportOptions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  statistics: {
    startTime: Date,
    endTime: Date,
    duration: Number,
    recordCount: Number,
    bytesGenerated: Number,
    avgRecordSize: Number
  },
  exportInfo: {
    fileName: String,
    fileSize: Number,
    fileFormat: String,
    downloadUrl: String,
    expiresAt: Date
  },
  apiInfo: {
    destination: String,
    method: String,
    headers: mongoose.Schema.Types.Mixed,
    success: Boolean,
    statusCode: Number,
    responseTime: Number,
    responseBody: String
  },
  error: {
    message: String,
    code: String,
    stack: String
  }
}, {
  timestamps: true
});

// Indexes for faster queries
historySchema.index({ user: 1, createdAt: -1 });
historySchema.index({ schema: 1 });
historySchema.index({ status: 1 });
historySchema.index({ 'options.format': 1 });

// Static method to get user statistics
historySchema.statics.getUserStatistics = async function(userId) {
  const pipeline = [
    { $match: { user: mongoose.Types.ObjectId(userId) } },
    { 
      $group: {
        _id: null,
        totalJobs: { $sum: 1 },
        totalRecords: { $sum: '$statistics.recordCount' },
        totalBytes: { $sum: '$statistics.bytesGenerated' },
        avgRecordSize: { $avg: '$statistics.avgRecordSize' },
        avgDuration: { $avg: '$statistics.duration' },
        successCount: {
          $sum: { 
            $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] 
          }
        },
        failureCount: { 
          $sum: { 
            $cond: [{ $eq: ['$status', 'failed'] }, 1, 0]
          }
        },
        formatBreakdown: {
          $push: '$options.format'
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalJobs: 1,
        totalRecords: 1,
        totalBytes: 1,
        avgRecordSize: 1,
        avgDuration: 1,
        successRate: { 
          $cond: [
            { $eq: ['$totalJobs', 0] }, 
            0, 
            { $divide: ['$successCount', '$totalJobs'] }
          ]
        },
        formatBreakdown: 1
      }
    }
  ];

  const result = await this.aggregate(pipeline);

  if (result.length === 0) {
    return {
      totalJobs: 0,
      totalRecords: 0,
      totalBytes: 0,
      avgRecordSize: 0,
      avgDuration: 0,
      successRate: 0,
      formatBreakdown: []
    };
  }

  // Process format breakdown to count occurrences
  const formatCounts = {};
  result[0].formatBreakdown.forEach(format => {
    formatCounts[format] = (formatCounts[format] || 0) + 1;
  });

  // Replace the array with the counts object
  result[0].formatBreakdown = Object.entries(formatCounts).map(([format, count]) => ({
    format,
    count,
    percentage: count / result[0].totalJobs
  }));

  return result[0];
};

const History = mongoose.model('History', historySchema);

module.exports = History;
