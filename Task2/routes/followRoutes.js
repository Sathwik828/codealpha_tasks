const express = require('express');
const router = express.Router();
const {
  followUser,
  unfollowUser,
  getUserFollowers,
  getUserFollowing
} = require('../controllers/followController');
const { protect } = require('../middleware/authMiddleware');

router.post('/follow/:userId', protect, followUser);
router.post('/unfollow/:userId', protect, unfollowUser);
router.get('/:userId/followers', protect, getUserFollowers);
router.get('/:userId/following', protect, getUserFollowing);

module.exports = router;
