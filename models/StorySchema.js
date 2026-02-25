const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  type: {
    type: String,
    default: 'Story',
    enum: ['Story']
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
    default: function() {
      // Stories expire after 24 hours by default
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
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
  // Story specific fields
  story_type: {
    type: String,
    enum: ['image', 'video', 'text'],
    default: 'video'
  },
  story_background_music: {
    type: String,
    default: ''
  },
  story_filters: [{
    type: String,
    trim: true
  }],
  story_stickers: [{
    type: {
      type: String,
      enum: ['emoji', 'text', 'gif', 'poll', 'question'],
      default: 'emoji'
    },
    position: {
      x: Number,
      y: Number
    },
    content: String,
    size: Number
  }],
  story_polls: [{
    question: String,
    options: [String],
    votes: [Number],
    total_votes: {
      type: Number,
      default: 0
    }
  }],
  story_viewers: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewed_at: {
      type: Date,
      default: Date.now
    },
    view_duration: Number
  }],
  story_mentions: [{
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String
  }],
  story_location: {
    type: String,
    default: ''
  },
  story_link: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes for performance
storySchema.index({ type: 1, created_at: -1 });
storySchema.index({ user_id: 1, type: 1 });
storySchema.index({ category: 1, is_active: 1 });
storySchema.index({ tags: 1, is_active: 1 });
storySchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ story_viewers: 1 });

module.exports = storySchema;
