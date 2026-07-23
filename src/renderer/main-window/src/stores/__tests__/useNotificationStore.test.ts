import { describe, it, expect, beforeEach, vi } from 'vitest'

import { useNotificationStore } from '~/renderer/main-window/src/stores/useNotificationStore'

describe('useNotificationStore (renderer)', () => {
  beforeEach(() => {
    useNotificationStore.setState({ notifications: [] })
  })

  it('adds a notification with auto-generated id', () => {
    useNotificationStore.getState().notify({ title: 'Test', type: 'info', message: 'Hello' })
    const state = useNotificationStore.getState()
    expect(state.notifications).toHaveLength(1)
    expect(state.notifications[0].title).toBe('Test')
    expect(state.notifications[0].type).toBe('info')
    expect(state.notifications[0].id).toMatch(/^notif_\d+/)
  })

  it('shows notification for default duration then removes it', async () => {
    vi.useFakeTimers()
    useNotificationStore.getState().notify({ title: 'Auto', type: 'success' })
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
    vi.advanceTimersByTime(5001)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
    vi.useRealTimers()
  })

  it('keeps notification when duration is 0', () => {
    vi.useFakeTimers()
    useNotificationStore.getState().notify({ title: 'Persist', type: 'error', duration: 0 })
    vi.advanceTimersByTime(10000)
    expect(useNotificationStore.getState().notifications).toHaveLength(1)
    vi.useRealTimers()
  })

  it('removes notification by id', () => {
    useNotificationStore.getState().notify({ title: 'Removable', type: 'info' })
    const id = useNotificationStore.getState().notifications[0].id
    useNotificationStore.getState().remove(id)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})
