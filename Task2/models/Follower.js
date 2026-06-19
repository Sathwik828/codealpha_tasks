const mongoose = require('mongoose');

const FollowerSchema = new mongoose.Schema({
  followerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  followingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to prevent duplicate follower records and speed up queries
FollowerSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

module.exports = mongoose.model('Follower', FollowerSchema);
