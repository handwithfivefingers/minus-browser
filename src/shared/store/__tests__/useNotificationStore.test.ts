import { describe, it, expect, beforeEach } from 'vitest'

import { useWebNotificationStore } from '~/shared/store/useNotificationStore'

describe('useWebNotificationStore', () => {
  beforeEach(() => {
    useWebNotificationStore.setState({ notifications: [], unreadCount: 0 })
  })

  it('adds a notification and increments unread count', () => {
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 'tab1',
      tabTitle: 'Test',
      favicon: '',
      title: 'Hello',
      timestamp: Date.now(),
      read: false,
    })
    const state = useWebNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.unreadCount).toBe(1)
    expect(state.notifications[0].title).toBe('Hello')
  })

  it('marks a notification as read', () => {
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 'tab1',
      tabTitle: 'Test',
      favicon: '',
      title: 'N1',
      timestamp: Date.now(),
      read: false,
    })
    const id = useWebNotificationStore.getState().notifications[0].id
    useWebNotificationStore.getState().markAsRead(id)
    const state = useWebNotificationStore.getState()
    expect(state.notifications[0].read).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('marks all notifications as read', () => {
    const store = useWebNotificationStore.getState()
    store.addNotification({ id: '', tabId: 't1', tabTitle: 'T', favicon: '', title: 'A', timestamp: 1, read: false })
    store.addNotification({ id: '', tabId: 't2', tabTitle: 'T', favicon: '', title: 'B', timestamp: 2, read: false })
    useWebNotificationStore.getState().markAllAsRead()
    const state = useWebNotificationStore.getState()
    expect(state.notifications.every((n) => n.read)).toBe(true)
    expect(state.unreadCount).toBe(0)
  })

  it('clears all notifications', () => {
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 't1',
      tabTitle: 'T',
      favicon: '',
      title: 'A',
      timestamp: 1,
      read: false,
    })
    useWebNotificationStore.getState().clear()
    const state = useWebNotificationStore.getState()
    expect(state.notifications).toHaveLength(0)
    expect(state.unreadCount).toBe(0)
  })

  it('prunes old notifications', () => {
    const old = Date.now() - 10 * 86400000
    const recent = Date.now()
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 't1',
      tabTitle: 'T',
      favicon: '',
      title: 'Old',
      timestamp: old,
      read: false,
    })
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 't2',
      tabTitle: 'T',
      favicon: '',
      title: 'Recent',
      timestamp: recent,
      read: false,
    })
    useWebNotificationStore.getState().prune(7)
    const state = useWebNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].title).toBe('Recent')
  })

  it('does not prune when maxDays is 0 or negative', () => {
    useWebNotificationStore.getState().addNotification({
      id: '',
      tabId: 't1',
      tabTitle: 'T',
      favicon: '',
      title: 'N',
      timestamp: 0,
      read: false,
    })
    useWebNotificationStore.getState().prune(0)
    expect(useWebNotificationStore.getState().notifications).toHaveLength(1)

    useWebNotificationStore.getState().prune(-1)
    expect(useWebNotificationStore.getState().notifications).toHaveLength(1)
  })
})
