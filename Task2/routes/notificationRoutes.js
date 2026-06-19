const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getNotifications);
router.put('/read', protect, markNotificationsAsRead);
router.get('/unread-count', protect, getUnreadCount);

module.exports = router;
