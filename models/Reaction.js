const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    content_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['star', 'share'], required: true, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

reactionSchema.index({ content_id: 1, user_id: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Reaction', reactionSchema);

