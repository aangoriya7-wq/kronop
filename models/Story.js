const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, enum: ['Story', 'Live'], required: true },
  url: { type: String, required: true },
  thumbnail: String,
  isLive: { type: Boolean, default: false },
  viewerCount: { type: Number, default: 0 },
  expiresAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Story', storySchema, 'Live_Stories');
