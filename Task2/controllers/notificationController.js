const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ receiverId: req.user.id })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username profilePicture')
      .populate({
        path: 'postId',
        select: 'content image'
      });

    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving notifications' });
  }
};

// @desc    Mark notifications as read
// @route   PUT /api/notifications/read
// @access  Private
const markNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { receiverId: req.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'Notifications marked as read'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error updating notifications' });
  }
};

// @desc    Get count of unread notifications
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      receiverId: req.user.id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount: count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error retrieving unread notification count' });
  }
};

module.exports = {
  getNotifications,
  markNotificationsAsRead,
  getUnreadCount
};
