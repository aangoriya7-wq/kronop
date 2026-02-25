const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    is_deleted: { type: Boolean, default: false, index: true },
    created_at: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

commentSchema.index({ content_id: 1, created_at: -1 });

module.exports = mongoose.model('Comment', commentSchema);

