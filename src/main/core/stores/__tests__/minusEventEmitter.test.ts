// @vitest-environment node
import { describe, it, expect, vi } from 'vitest'

import { eventStore } from '~/main/core/stores/minusEventEmitter'

describe('MinusEventEmitter', () => {
  it('broadcasts and listens for events', () => {
    const spy = vi.fn()
    eventStore.listen('test-event', spy)
    eventStore.broadcast('test-event', { data: 42 })
    expect(spy).toHaveBeenCalledWith({ data: 42 })
  })

  it('tracks events in eventListeners map', () => {
    eventStore.broadcast('tracked-event', 'value')
    expect(eventStore.eventListeners.get('tracked-event')).toBe(true)
  })

  it('removes all listeners on destroy', () => {
    const spy = vi.fn()
    eventStore.listen('temp-event', spy)
    eventStore.destroy()
    eventStore.broadcast('temp-event', 'data')
    expect(spy).not.toHaveBeenCalled()
  })

  it('supports multiple listeners for same event', () => {
    const spy1 = vi.fn()
    const spy2 = vi.fn()
    eventStore.listen('multi-event', spy1)
    eventStore.listen('multi-event', spy2)
    eventStore.broadcast('multi-event', 'hello')
    expect(spy1).toHaveBeenCalledWith('hello')
    expect(spy2).toHaveBeenCalledWith('hello')
  })

  it('has maxListeners set to 15', () => {
    expect(eventStore.getMaxListeners()).toBe(15)
  })
})
