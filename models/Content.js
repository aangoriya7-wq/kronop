const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    required: true,
    enum: ['Reel', 'Story', 'Live', 'Video', 'Photo', 'ShayariPhoto'],
    index: true
  },
  bunny_id: {
    type: String,
    required: false,
    unique: false, // Remove unique constraint to avoid duplicate key errors
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
  // Add virtual for createdAt to maintain compatibility
  createdAt: {
    type: Date,
    get: function() { return this.created_at; },
    set: function(val) { this.created_at = val; }
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
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Make optional for system content
    default: null
  },
  // Shayari Photo specific fields
  shayari_text: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  shayari_author: {
    type: String,
    maxlength: 100,
    default: ''
  }
}, {
  timestamps: true
});

contentSchema.index({ type: 1, created_at: -1 });
contentSchema.index({ user_id: 1, type: 1 });
contentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Content', contentSchema);
