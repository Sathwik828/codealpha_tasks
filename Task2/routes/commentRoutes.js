const express = require('express');
const router = express.Router();
const { addComment, deleteComment, getPostComments } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/:postId')
  .post(protect, addComment)
  .get(protect, getPostComments);

router.delete('/:id', protect, deleteComment);

module.exports = router;
