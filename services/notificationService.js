const Notification = require("../models/Notification");

class NotificationService {
  // Create a new notification
  static async createNotification({
    userId,
    type,
    title,
    message,
    priority = "medium",
    actionUrl = null,
    actionText = null,
  }) {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        priority,
        actionUrl,
        actionText,
      });

      await notification.save();
      console.log(`Notification created for user ${userId}: ${title}`);
      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId, limit = 20, includeRead = false) {
    try {
      const filter = { userId };
      if (!includeRead) {
        filter.isRead = false;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);

      return notifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }

  // Get unread notification count
  static async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({
        userId,
        isRead: false,
      });
      return count;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );
      return notification;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      return null;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true, readAt: new Date() }
      );
      return result.modifiedCount;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      return 0;
    }
  }

  // Check and create email required notification
  static async checkAndCreateEmailNotification(userId) {
    try {
      const User = require("../models/user");
      const user = await User.findById(userId);

      if (!user) return false;

      // Check if user has no email or empty email
      const hasNoEmail = !user.email || user.email.trim() === "";

      if (!hasNoEmail) return false;

      // Check if this notification already exists and is unread
      const existingNotification = await Notification.findOne({
        userId,
        type: "email_required",
        isRead: false,
      });

      if (existingNotification) return false;

      // Create the notification
      await this.createNotification({
        userId,
        type: "email_required",
        title: "Email Address Required",
        message:
          "You must enter your email address in account management page in order to reset the password in case you forget it.",
        priority: "high",
        actionUrl: "/account",
        actionText: "Update Email",
      });

      return true;
    } catch (error) {
      console.error("Error checking/creating email notification:", error);
      return false;
    }
  }

  // Delete old notifications (cleanup)
  static async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        isRead: true,
        readAt: { $lt: cutoffDate },
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
      return 0;
    }
  }
}

module.exports = NotificationService;
