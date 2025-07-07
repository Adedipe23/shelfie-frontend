import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';
import { notificationService } from '../../services/notificationService';
import { useToast } from '../../hooks/useToast';
import Button from '../ui/Button';
import Card from '../ui/Card';

interface NotificationPanelProps {
  showAll?: boolean;
  maxItems?: number;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  showAll = false,
  maxItems = 5
}) => {
  const {
    notifications,
    unreadCount,
    isLoading,
    setNotifications,
    markAsRead,
    markAllAsRead,
    setLoading,
  } = useNotificationStore();

  const { isAuthenticated, authToken } = useAuthStore();
  const { showError, showSuccess } = useToast();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Only fetch notifications when authenticated
    if (isAuthenticated && authToken) {
      fetchNotifications();

      // Set up periodic refresh for notifications
      const interval = setInterval(fetchNotifications, 30000); // Every 30 seconds

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, authToken]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const notificationsData = await notificationService.getNotifications(!showAll);
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      if (!showAll) { // Only show error for main notification fetch, not background refresh
        showError('Failed to load notifications');
      }
    }
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationService.markAsRead(notificationId);
      markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      showError('Failed to update notification');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
    showSuccess('Notifications refreshed');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'low_stock':
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
        );
      case 'expiry_warning':
        return (
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
            <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-full">
            <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500';
      case 'medium':
        return 'border-l-yellow-500';
      case 'low':
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-500';
    }
  };

  const displayNotifications = showAll ? notifications : notifications.slice(0, maxItems);

  if (isLoading && notifications.length === 0) {
    return (
      <Card title="Notifications">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
              >
                Mark all read
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {displayNotifications.length > 0 ? (
          displayNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 ${getPriorityColor(notification.priority)} ${
                notification.is_read 
                  ? 'bg-gray-50 dark:bg-gray-800/50' 
                  : 'bg-white dark:bg-gray-800 shadow-sm'
              }`}
            >
              {getNotificationIcon(notification.type)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className={`text-sm font-medium ${
                    notification.is_read 
                      ? 'text-gray-600 dark:text-gray-400' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {notification.title}
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(notification.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <p className={`text-sm mt-1 ${
                  notification.is_read 
                    ? 'text-gray-500 dark:text-gray-500' 
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {notification.message}
                </p>
                
                {!notification.is_read && (
                  <button
                    onClick={() => handleMarkAsRead(notification.id)}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-300 mt-2"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5v-5a7.5 7.5 0 01-7.5-7.5H7.5a7.5 7.5 0 017.5 7.5v5z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No notifications</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              You're all caught up! No new notifications.
            </p>
          </div>
        )}
        
        {!showAll && notifications.length > maxItems && (
          <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" size="sm">
              View all notifications ({notifications.length})
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default NotificationPanel;
