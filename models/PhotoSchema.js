const mongoose = require('mongoose');

const photoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'Photo',
    enum: ['Photo']
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
  // Photo specific fields
  photo_resolution: {
    width: Number,
    height: Number
  },
  photo_aspect_ratio: {
    type: String,
    enum: ['1:1', '4:3', '16:9', '3:2'],
    default: '4:3'
  },
  photo_file_size: {
    type: Number,
    default: 0 // Size in bytes
  },
  photo_format: {
    type: String,
    enum: ['JPEG', 'PNG', 'WEBP', 'GIF'],
    default: 'JPEG'
  },
  photo_color_profile: {
    type: String,
    enum: ['sRGB', 'Adobe RGB', 'ProPhoto RGB'],
    default: 'sRGB'
  },
  photo_camera: {
    make: String,
    model: String,
    lens: String
  },
  photo_exif: {
    iso: Number,
    aperture: String,
    shutter_speed: String,
    focal_length: String,
    flash: Boolean
  },
  photo_location: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    country: String
  },
  photo_filters: [{
    type: String,
    trim: true
  }],
  photo_editing_tools: [{
    tool: String,
    settings: mongoose.Schema.Types.Mixed
  }],
  photo_captions: [{
    text: String,
    position: {
      x: Number,
      y: Number
    },
    style: {
      font: String,
      size: Number,
      color: String
    }
  }],
  photo_tags_people: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    position: {
      x: Number,
      y: Number
    }
  }]
}, {
  timestamps: true
});

// Indexes for performance
photoSchema.index({ type: 1, created_at: -1 });
photoSchema.index({ user_id: 1, type: 1 });
photoSchema.index({ category: 1, is_active: 1 });
photoSchema.index({ tags: 1, is_active: 1 });
photoSchema.index({ views: -1 });
photoSchema.index({ likes: -1 });
photoSchema.index({ 'photo_location.city': 1 });

module.exports = photoSchema;
