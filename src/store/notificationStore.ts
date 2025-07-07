import { create } from 'zustand';
import { Notification } from '../types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  lastChecked: Date | null;
}

interface NotificationActions {
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  setLoading: (loading: boolean) => void;
  updateLastChecked: () => void;
  getUnreadNotifications: () => Notification[];
  getHighPriorityNotifications: () => Notification[];
}

type NotificationStore = NotificationState & NotificationActions;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  lastChecked: null,

  // Actions
  setNotifications: (notifications: Notification[]) => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    set({ 
      notifications, 
      unreadCount,
      isLoading: false 
    });
  },

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: notification.is_read ? state.unreadCount : state.unreadCount + 1,
    }));
  },

  markAsRead: (notificationId: number) => {
    set((state) => ({
      notifications: state.notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  updateLastChecked: () => {
    set({ lastChecked: new Date() });
  },

  getUnreadNotifications: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.is_read);
  },

  getHighPriorityNotifications: () => {
    const { notifications } = get();
    return notifications.filter(n => !n.is_read && n.priority === 'high');
  },
}));
