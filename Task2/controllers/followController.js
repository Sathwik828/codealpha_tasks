const User = require('../models/User');
const Follower = require('../models/Follower');
const Notification = require('../models/Notification');

// @desc    Follow a user
// @route   POST /api/follows/follow/:userId
// @access  Private
const followUser = async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.user.id;

    if (followerId === followingId) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    // Check if target user exists
    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User to follow not found' });
    }

    // Check if already following
    const alreadyFollowing = await Follower.findOne({ followerId, followingId });
    if (alreadyFollowing) {
      return res.status(400).json({ success: false, message: 'You are already following this user' });
    }

    // Create follow relationship record
    await Follower.create({ followerId, followingId });

    // Update arrays in User documents
    await User.findByIdAndUpdate(followerId, { $addToSet: { following: followingId } });
    await User.findByIdAndUpdate(followingId, { $addToSet: { followers: followerId } });

    // Create notification
    await Notification.create({
      receiverId: followingId,
      senderId: followerId,
      type: 'follow'
    });

    res.status(200).json({
      success: true,
      message: `Successfully followed ${targetUser.username}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during follow action' });
  }
};

// @desc    Unfollow a user
// @route   POST /api/follows/unfollow/:userId
// @access  Private
const unfollowUser = async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId = req.user.id;

    // Check if target user exists
    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User to unfollow not found' });
    }

    // Check if relationship exists
    const followRecord = await Follower.findOne({ followerId, followingId });
    if (!followRecord) {
      return res.status(400).json({ success: false, message: 'You are not following this user' });
    }

    // Delete follow record
    await Follower.deleteOne({ _id: followRecord._id });

    // Update arrays in User documents
    await User.findByIdAndUpdate(followerId, { $pull: { following: followingId } });
    await User.findByIdAndUpdate(followingId, { $pull: { followers: followerId } });

    // Delete associated follow notification
    await Notification.deleteOne({
      senderId: followerId,
      receiverId: followingId,
      type: 'follow'
    });

    res.status(200).json({
      success: true,
      message: `Successfully unfollowed ${targetUser.username}`
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error during unfollow action' });
  }
};

// @desc    Get followers list for a user
// @route   GET /api/follows/:userId/followers
// @access  Private
const getUserFollowers = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('followers', 'username profilePicture bio');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      count: user.followers.length,
      data: user.followers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving followers list' });
  }
};

// @desc    Get following list for a user
// @route   GET /api/follows/:userId/following
// @access  Private
const getUserFollowing = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('following', 'username profilePicture bio');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      count: user.following.length,
      data: user.following
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving following list' });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing
};
