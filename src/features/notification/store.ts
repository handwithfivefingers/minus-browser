import { create } from "zustand";

export interface WebNotification {
  id: string;
  tabId: string;
  tabTitle: string;
  favicon: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}

interface NotificationStore {
  notifications: WebNotification[];
  unreadCount: number;
  addNotification: (n: WebNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
  prune: (maxDays: number) => void;
}

let _id = 0;

const useWebNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: `wn_${++_id}` }, ...s.notifications],
      unreadCount: s.unreadCount + 1,
    })),
  markAsRead: (id) =>
    set((s) => {
      const notifications = s.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n,
      );
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  clear: () => set({ notifications: [], unreadCount: 0 }),
  prune: (maxDays) =>
    set((s) => {
      if (maxDays <= 0) return s;
      const cutoff = Date.now() - maxDays * 86400000;
      const notifications = s.notifications.filter((n) => n.timestamp >= cutoff);
      return { notifications, unreadCount: notifications.filter((n) => !n.read).length };
    }),
}));

export { useWebNotificationStore };
