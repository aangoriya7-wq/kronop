const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  chatId: { type: String, required: true, unique: true },
  participants: [{ type: String }],
  messages: [{
    senderId: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }],
  notifications: [{
    recipientId: String,
    type: String,
    content: String,
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema, 'Chats');
