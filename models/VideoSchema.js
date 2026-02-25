const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'Video',
    enum: ['Video']
  },
  bunny_id: {
    type: String,
    required: false,
    default: null
  },
  url: {
    type: String,
    required: true
  },
  thumbnail: {
    type: String,
    default: null
  },
  duration: {
    type: Number,
    default: 0 // Duration in seconds
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  },
  expires_at: {
    type: Date,
    default: null
  },
  is_active: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  tags: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    trim: true,
    default: ''
  },
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  comments: {
    type: Number,
    default: 0
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null
  },
  // Video specific fields
  video_resolution: {
    type: String,
    enum: ['480p', '720p', '1080p', '4K'],
    default: '1080p'
  },
  video_aspect_ratio: {
    type: String,
    enum: ['16:9', '4:3', '1:1'],
    default: '16:9'
  },
  video_file_size: {
    type: Number,
    default: 0 // Size in bytes
  },
  video_codec: {
    type: String,
    default: 'h264'
  },
  video_quality: {
    type: String,
    enum: ['low', 'medium', 'high', 'ultra'],
    default: 'high'
  },
  video_subtitle_url: {
    type: String,
    default: ''
  },
  video_chapters: [{
    timestamp: Number,
    title: String
  }]
}, {
  timestamps: true
});

// Indexes for performance
videoSchema.index({ type: 1, created_at: -1 });
videoSchema.index({ user_id: 1, type: 1 });
videoSchema.index({ category: 1, is_active: 1 });
videoSchema.index({ tags: 1, is_active: 1 });
videoSchema.index({ views: -1 });
videoSchema.index({ likes: -1 });
videoSchema.index({ duration: 1 });

module.exports = videoSchema;
