const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: false, // Changed from true to false
    unique: true,
    sparse: true, // Added sparse to allow multiple nulls
    trim: true
  },
  email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true
  },
  password: {
    type: String,
    default: ''
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null/undefined to be non-unique
    trim: true
  },
  displayName: {
    type: String,
    default: ''
  },
  avatar: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  profilePic: {
    type: String,
    default: ''
  },
  avatar_url: {
    type: String,
    default: ''
  },
  cover_image_url: {
    type: String,
    default: ''
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  supporters: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  supporting: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  verified: {
    type: Boolean,
    default: false
  },
  pushToken: {
    type: String
  },
  oneSignalPlayerId: {
    type: String
  },
  savedContent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Content',
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  seen_reels: [{
    reel_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      required: true
    },
    viewed_at: {
      type: Date,
      default: Date.now
    },
    view_duration: {
      type: Number, // in seconds
      default: 0
    },
    completed: {
      type: Boolean,
      default: false
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Add indexes for better search performance
userSchema.index({ username: 'text', displayName: 'text', bio: 'text' });
// userSchema.index({ username: 1 }); // Removed - already defined as unique in schema
userSchema.index({ displayName: 1 });
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);



