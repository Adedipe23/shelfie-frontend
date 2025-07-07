import { secureInvoke } from '../utils/apiInterceptor';
import { onlineFirstService } from './onlineFirstService';
import { Notification, Product } from '../types';

export const notificationService = {
  // Get notifications for current user - mock for now since no API endpoint exists
  getNotifications: async (unreadOnly: boolean = false): Promise<Notification[]> => {
    try {
      // Try local first since there's no online notification API yet
      return await secureInvoke('get_notifications', {
        user_id: null, // null means current user
        unread_only: unreadOnly
      });
    } catch (error) {
      console.warn('Local notifications not available:', error);
      // Return empty array if local notifications fail
      return [];
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId: number): Promise<void> => {
    try {
      return await secureInvoke('mark_notification_read', { notificationId });
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
      // Don't throw error for notification operations
    }
  },

  // Get products expiring soon - use low stock products as a substitute
  getExpiringProducts: async (_daysAhead: number = 7): Promise<Product[]> => {
    try {
      // Since there's no expiry date in the new schema, use low stock products instead
      return await onlineFirstService.products.getLowStock() as Product[];
    } catch (error) {
      console.warn('Failed to get low stock products:', error);
      return [];
    }
  },

  // Manually trigger alert checking (for admins)
  checkAlerts: async (): Promise<void> => {
    try {
      return await secureInvoke('check_alerts');
    } catch (error) {
      // Silent error handling for production
    }
  },

  // Create a notification (admin only)
  createNotification: async (data: {
    userId?: number;
    title: string;
    message: string;
    type: string;
    priority: string;
    productId?: number;
  }): Promise<number> => {
    try {
      return await secureInvoke('create_notification', {
        user_id: data.userId,
        title: data.title,
        message: data.message,
        notification_type: data.type,
        priority: data.priority,
        product_id: data.productId,
      });
    } catch (error) {
      return 0;
    }
  },
};
