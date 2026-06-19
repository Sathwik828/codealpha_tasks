const User = require('../models/User');
const Post = require('../models/Post');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// @desc    Get user profile by username
// @route   GET /api/users/profile/:username
// @access  Private (or Public, but let's require login)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .populate('followers', 'username profilePicture bio')
      .populate('following', 'username profilePicture bio');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Get posts by this user
    const posts = await Post.find({ userId: user._id }).sort({ createdAt: -1 });

    // Determine if logged-in user is following this user
    const isFollowing = user.followers.some(
      (follower) => follower._id.toString() === req.user.id
    );

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
        website: user.website,
        followers: user.followers,
        following: user.following,
        createdAt: user.createdAt,
        posts,
        isFollowing
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving user profile' });
  }
};

// @desc    Update user profile (bio, location, website)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const { bio, location, website } = req.body;
    
    // Find user
    let user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.bio = bio !== undefined ? bio : user.bio;
    user.location = location !== undefined ? location : user.location;
    user.website = website !== undefined ? website : user.website;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
        location: user.location,
        website: user.website,
        followers: user.followers,
        following: user.following
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Upload profile picture
// @route   POST /api/users/profile/picture
// @access  Private
const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete old profile picture if exists and not default
    if (user.profilePicture) {
      const oldPath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(oldPath)) {
        try {
          fs.unlinkSync(oldPath);
        } catch (err) {
          console.error('Error deleting old avatar:', err.message);
        }
      }
    }

    // Save relative image url
    const relativeUrl = `/uploads/${req.file.filename}`;
    user.profilePicture = relativeUrl;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture updated successfully',
      profilePicture: relativeUrl
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error uploading profile picture' });
  }
};

// @desc    Search users by username
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    const users = await User.find({
      username: { $regex: query, $options: 'i' }
    }).select('username profilePicture bio followers following');

    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error searching users' });
  }
};

// @desc    Get follow suggestions
// @route   GET /api/users/suggestions
// @access  Private
const getFollowSuggestions = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);

    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Exclude current user and users current user is already following
    const excludeIds = [currentUserId, ...currentUser.following];

    const suggestions = await User.find({
      _id: { $nin: excludeIds }
    })
      .select('username profilePicture bio location')
      .limit(5);

    res.status(200).json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving suggestions' });
  }
};

// @desc    Get dashboard analytics
// @route   GET /api/users/analytics
// @access  Private
const getDashboardAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Count posts
    const totalPosts = await Post.countDocuments({ userId });

    // Aggregate likes received on all posts by this user
    const posts = await Post.find({ userId });
    let totalLikesReceived = 0;
    posts.forEach(post => {
      totalLikesReceived += post.likes.length;
    });

    res.status(200).json({
      success: true,
      data: {
        totalPosts,
        totalFollowers: user.followers.length,
        totalFollowing: user.following.length,
        totalLikesReceived
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving analytics' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  searchUsers,
  getFollowSuggestions,
  getDashboardAnalytics
};
