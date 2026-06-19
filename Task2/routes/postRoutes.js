const express = require('express');
const router = express.Router();
const {
  createPost,
  editPost,
  deletePost,
  getPersonalizedFeed,
  getExploreFeed,
  toggleLikePost,
  searchPosts
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Static routes first
router.get('/feed', protect, getPersonalizedFeed);
router.get('/explore', protect, getExploreFeed);
router.get('/search', protect, searchPosts);

// General CRUD & operations
router.post('/', protect, upload.single('postImage'), createPost);
router.put('/:id', protect, editPost);
router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, toggleLikePost);

module.exports = router;
