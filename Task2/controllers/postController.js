const Post = require('../models/Post');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');

// @desc    Create a new post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    let imageUrl = '';

    if (!content && !req.file) {
      return res.status(400).json({ success: false, message: 'Post content or image is required' });
    }

    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }

    const post = await Post.create({
      userId: req.user.id,
      content: content || '',
      image: imageUrl
    });

    // Populate user info for frontend immediate render
    const populatedPost = await Post.findById(post._id).populate('userId', 'username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      data: populatedPost
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error creating post' });
  }
};

// @desc    Update a post
// @route   PUT /api/posts/:id
// @access  Private
const editPost = async (req, res) => {
  try {
    const { content } = req.body;
    
    let post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check post ownership
    if (post.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'User not authorized to edit this post' });
    }

    post.content = content !== undefined ? content : post.content;
    await post.save();

    const populatedPost = await Post.findById(post._id).populate('userId', 'username profilePicture');

    res.status(200).json({
      success: true,
      message: 'Post updated successfully',
      data: populatedPost
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating post' });
  }
};

// @desc    Delete a post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check ownership
    if (post.userId.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'User not authorized to delete this post' });
    }

    // Delete post image from local filesystem if exists
    if (post.image) {
      const imgPath = path.join(__dirname, '..', post.image);
      if (fs.existsSync(imgPath)) {
        try {
          fs.unlinkSync(imgPath);
        } catch (err) {
          console.error('Error deleting post image file:', err.message);
        }
      }
    }

    // Delete associated comments
    await Comment.deleteMany({ postId: post._id });

    // Delete associated notifications
    await Notification.deleteMany({ postId: post._id });

    // Delete the post
    await Post.deleteOne({ _id: post._id });

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error deleting post' });
  }
};

// @desc    Get personalized news feed (from users you follow + yourself)
// @route   GET /api/posts/feed
// @access  Private
const getPersonalizedFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Get list of followed user IDs plus own ID
    const user = await User.findById(req.user.id);
    const feedUserIds = [...user.following, req.user.id];

    const posts = await Post.find({ userId: { $in: feedUserIds } })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username profilePicture')
      .populate({
        path: 'likes',
        select: 'username profilePicture'
      });

    const total = await Post.countDocuments({ userId: { $in: feedUserIds } });

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: startIndex + limit < total
      },
      data: posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving feed' });
  }
};

// @desc    Get explore feed (trending / popular posts and public recent feeds)
// @route   GET /api/posts/explore
// @access  Private
const getExploreFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // Retrieve explore feed. For explore feed, we can sort by recency or by most liked posts.
    // Let's implement an aggregation/query that returns posts sorted by recency but includes liked counts
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('userId', 'username profilePicture')
      .populate('likes', 'username profilePicture');

    const total = await Post.countDocuments({});

    // Let's also fetch a trending posts list (posts with the most likes)
    const trendingPosts = await Post.find({})
      .populate('userId', 'username profilePicture')
      .exec();

    // Sort by likes array length descending
    trendingPosts.sort((a, b) => b.likes.length - a.likes.length);
    const topTrending = trendingPosts.slice(0, 5);

    res.status(200).json({
      success: true,
      count: posts.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: startIndex + limit < total
      },
      data: posts,
      trending: topTrending
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving explore feed' });
  }
};

// @desc    Toggle like/unlike post
// @route   POST /api/posts/:id/like
// @access  Private
const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    // Check if post is already liked by current user
    const likeIndex = post.likes.indexOf(req.user.id);
    let isLiked = false;

    if (likeIndex > -1) {
      // User already liked, so unlike it
      post.likes.splice(likeIndex, 1);
      
      // Delete notification of this like if it exists
      await Notification.deleteOne({
        senderId: req.user.id,
        receiverId: post.userId,
        type: 'like',
        postId: post._id
      });
    } else {
      // User hasn't liked, so like it
      post.likes.push(req.user.id);
      isLiked = true;

      // Create notification if liked other user's post
      if (post.userId.toString() !== req.user.id) {
        await Notification.create({
          receiverId: post.userId,
          senderId: req.user.id,
          type: 'like',
          postId: post._id
        });
      }
    }

    await post.save();
    
    const populatedPost = await Post.findById(post._id).populate('likes', 'username profilePicture');

    res.status(200).json({
      success: true,
      isLiked,
      likesCount: populatedPost.likes.length,
      likes: populatedPost.likes
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error toggling like status' });
  }
};

// @desc    Search posts by keyword
// @route   GET /api/posts/search
// @access  Private
const searchPosts = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Search posts containing text or search index
    const posts = await Post.find({
      $or: [
        { content: { $regex: query, $options: 'i' } }
      ]
    })
      .sort({ createdAt: -1 })
      .populate('userId', 'username profilePicture')
      .populate('likes', 'username profilePicture');

    res.status(200).json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error searching posts' });
  }
};

module.exports = {
  createPost,
  editPost,
  deletePost,
  getPersonalizedFeed,
  getExploreFeed,
  toggleLikePost,
  searchPosts
};
