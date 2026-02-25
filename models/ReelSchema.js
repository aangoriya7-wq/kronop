const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'Reel',
    enum: ['Reel']
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
  // Reel specific fields
  reel_resolution: {
    type: String,
    enum: ['720p', '1080p', '4K'],
    default: '1080p'
  },
  reel_aspect_ratio: {
    type: String,
    enum: ['9:16', '16:9', '1:1'],
    default: '9:16'
  },
  reel_audio_track: {
    type: String,
    default: ''
  },
  reel_hashtags: [{
    type: String,
    trim: true
  }],
  reel_location: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for performance
reelSchema.index({ type: 1, created_at: -1 });
reelSchema.index({ user_id: 1, type: 1 });
reelSchema.index({ category: 1, is_active: 1 });
reelSchema.index({ tags: 1, is_active: 1 });
reelSchema.index({ views: -1 });
reelSchema.index({ likes: -1 });

module.exports = reelSchema;
