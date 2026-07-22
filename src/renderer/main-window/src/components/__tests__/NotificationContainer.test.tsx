import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { NotificationContainer } from '~/renderer/main-window/src/components/NotificationContainer'
import { useNotificationStore } from '~/renderer/main-window/src/stores/useNotificationStore'

describe('NotificationContainer', () => {
  beforeEach(() => {
    cleanup()
    useNotificationStore.setState({ notifications: [] })
  })

  it('renders nothing when no notifications', () => {
    const { container } = render(<NotificationContainer />)
    expect(container.innerHTML).toBe('')
  })

  it('renders notification with title and message', () => {
    useNotificationStore.getState().notify({ title: 'Success', message: 'Operation completed', type: 'success' })
    const { container } = render(<NotificationContainer />)
    expect(container.textContent).toContain('Success')
    expect(container.textContent).toContain('Operation completed')
  })

  it('renders action button when provided', () => {
    const onClick = vi.fn()
    useNotificationStore.getState().notify({
      title: 'Update',
      type: 'info',
      duration: 0,
      action: { label: 'Restart', onClick },
    })
    render(<NotificationContainer />)
    fireEvent.click(screen.getByText('Restart'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('removes notification on close click', () => {
    useNotificationStore.getState().notify({ title: 'Removable', type: 'info', duration: 0 })
    render(<NotificationContainer />)
    const closeBtn = document.querySelector('button[type="button"]')
    expect(closeBtn).toBeDefined()
    fireEvent.click(closeBtn!)
    expect(useNotificationStore.getState().notifications).toHaveLength(0)
  })
})
