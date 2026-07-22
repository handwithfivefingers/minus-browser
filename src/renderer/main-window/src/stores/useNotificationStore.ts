import { create } from 'zustand'

let _id = 0

export interface AppNotification {
  id: string
  title: string
  message?: string
  type: 'success' | 'error' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface NotificationStore {
  notifications: AppNotification[]
  notify: (n: Omit<AppNotification, 'id'>) => void
  remove: (id: string) => void
}

const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  notify: (n) => {
    const id = `notif_${++_id}`
    set((s) => ({ notifications: [...s.notifications, { ...n, id }] }))
    const duration = n.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) }))
      }, duration)
    }
  },
  remove: (id) => {
    set((s) => ({ notifications: s.notifications.filter((x) => x.id !== id) }))
  },
}))

export { useNotificationStore }
