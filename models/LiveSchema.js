const mongoose = require('mongoose');

const liveSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'Live',
    enum: ['Live']
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
  // Live specific fields
  live_status: {
    type: String,
    enum: ['scheduled', 'live', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  live_start_time: {
    type: Date,
    default: null
  },
  live_end_time: {
    type: Date,
    default: null
  },
  live_duration: {
    type: Number,
    default: 0 // Duration in seconds
  },
  live_viewer_count: {
    type: Number,
    default: 0
  },
  live_max_viewers: {
    type: Number,
    default: 0
  },
  live_stream_key: {
    type: String,
    default: ''
  },
  live_chat_enabled: {
    type: Boolean,
    default: true
  },
  live_recording_url: {
    type: String,
    default: ''
  },
  live_schedule_time: {
    type: Date,
    default: null
  },
  live_privacy: {
    type: String,
    enum: ['public', 'private', 'unlisted'],
    default: 'public'
  }
}, {
  timestamps: true
});

// Indexes for performance
liveSchema.index({ type: 1, created_at: -1 });
liveSchema.index({ user_id: 1, type: 1 });
liveSchema.index({ category: 1, is_active: 1 });
liveSchema.index({ tags: 1, is_active: 1 });
liveSchema.index({ live_status: 1 });
liveSchema.index({ live_start_time: -1 });
liveSchema.index({ live_viewer_count: -1 });

module.exports = liveSchema;
