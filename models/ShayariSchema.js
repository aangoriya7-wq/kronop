const mongoose = require('mongoose');

const shayariSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'ShayariPhoto',
    enum: ['ShayariPhoto']
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
  // Shayari specific fields
  shayari_text: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  shayari_author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  shayari_category: {
    type: String,
    enum: [
      'romantic', 'sad', 'friendship', 'motivational', 'funny',
      'life', 'love', 'heartbreak', 'nature', 'spiritual',
      'patriotic', 'birthday', 'festival', 'misc'
    ],
    default: 'romantic'
  },
  shayari_language: {
    type: String,
    enum: ['hindi', 'urdu', 'english', 'hinglish'],
    default: 'hindi'
  },
  shayari_mood: {
    type: String,
    enum: ['happy', 'sad', 'romantic', 'inspirational', 'emotional'],
    default: 'romantic'
  },
  shayari_length: {
    type: String,
    enum: ['short', 'medium', 'long'],
    default: 'medium'
  },
  shayari_theme: {
    type: String,
    trim: true,
    default: ''
  },
  shayari_background_style: {
    type: String,
    enum: ['nature', 'abstract', 'solid', 'gradient', 'texture'],
    default: 'nature'
  },
  shayari_font_style: {
    type: String,
    enum: ['hindi', 'urdu', 'english', 'artistic'],
    default: 'hindi'
  },
  shayari_color_scheme: {
    primary: String,
    secondary: String,
    text: String
  },
  shayari_is_featured: {
    type: Boolean,
    default: false
  },
  shayari_is_trending: {
    type: Boolean,
    default: false
  },
  shayari_rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 0
  },
  shayari_ratings_count: {
    type: Number,
    default: 0
  },
  shayari_collections: [{
    name: String,
    description: String
  }],
  shayari_hashtags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Indexes for performance
shayariSchema.index({ type: 1, created_at: -1 });
shayariSchema.index({ user_id: 1, type: 1 });
shayariSchema.index({ category: 1, is_active: 1 });
shayariSchema.index({ tags: 1, is_active: 1 });
shayariSchema.index({ shayari_author: 1 });
shayariSchema.index({ shayari_category: 1 });
shayariSchema.index({ shayari_language: 1 });
shayariSchema.index({ shayari_mood: 1 });
shayariSchema.index({ views: -1 });
shayariSchema.index({ likes: -1 });
shayariSchema.index({ shayari_is_featured: 1 });
shayariSchema.index({ shayari_is_trending: 1 });
shayariSchema.index({ shayari_rating: -1 });

module.exports = shayariSchema;
