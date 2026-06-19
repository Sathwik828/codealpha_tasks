const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateUserProfile,
  updateProfilePicture,
  searchUsers,
  getFollowSuggestions,
  getDashboardAnalytics
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

router.get('/profile/:username', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.post('/profile/picture', protect, upload.single('profilePicture'), updateProfilePicture);
router.get('/search', protect, searchUsers);
router.get('/suggestions', protect, getFollowSuggestions);
router.get('/analytics', protect, getDashboardAnalytics);

module.exports = router;
