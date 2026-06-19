const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Notification = require('../models/Notification');

// @desc    Add comment to a post
// @route   POST /api/comments/:postId
// @access  Private
const addComment = async (req, res) => {
  try {
    const { commentText } = req.body;
    const { postId } = req.params;

    if (!commentText) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comment = await Comment.create({
      postId,
      userId: req.user.id,
      commentText
    });

    // Increment commentsCount in Post
    post.commentsCount = (post.commentsCount || 0) + 1;
    await post.save();

    // Create notification if comment is by another user
    if (post.userId.toString() !== req.user.id) {
      await Notification.create({
        receiverId: post.userId,
        senderId: req.user.id,
        type: 'comment',
        postId: post._id
      });
    }

    // Populate user info for immediate display
    const populatedComment = await Comment.findById(comment._id).populate('userId', 'username profilePicture');

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: populatedComment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error adding comment' });
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ success: false, message: 'Comment not found' });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Associated post not found' });
    }

    // Authorized if user is the comment owner OR the post owner
    const isCommentOwner = comment.userId.toString() === req.user.id;
    const isPostOwner = post.userId.toString() === req.user.id;

    if (!isCommentOwner && !isPostOwner) {
      return res.status(401).json({ success: false, message: 'User not authorized to delete this comment' });
    }

    // Delete comment
    await Comment.deleteOne({ _id: comment._id });

    // Decrement commentsCount in Post
    post.commentsCount = Math.max(0, (post.commentsCount || 0) - 1);
    await post.save();

    // Clean up notifications for this comment if they exist
    await Notification.deleteOne({
      senderId: comment.userId,
      receiverId: post.userId,
      type: 'comment',
      postId: post._id
    });

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error deleting comment' });
  }
};

// @desc    Get comments for a specific post
// @route   GET /api/comments/:postId
// @access  Private
const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.exists({ _id: postId });
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const comments = await Comment.find({ postId })
      .sort({ createdAt: 1 })
      .populate('userId', 'username profilePicture');

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving comments' });
  }
};

module.exports = {
  addComment,
  deleteComment,
  getPostComments
};
