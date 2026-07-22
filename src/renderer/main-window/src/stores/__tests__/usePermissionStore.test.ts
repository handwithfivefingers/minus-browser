import { describe, it, expect, beforeEach } from 'vitest'
import {
  usePermissionStore,
  getPermissionLabel,
  getPermissionIcon,
} from '~/renderer/main-window/src/stores/usePermissionStore'

describe('usePermissionStore', () => {
  beforeEach(() => {
    usePermissionStore.setState({ pendingRequests: [] })
  })

  it('adds a permission request', () => {
    const req = { requestId: 'r1', permission: 'geolocation' as const, origin: 'https://example.com' }
    usePermissionStore.getState().addRequest(req)
    expect(usePermissionStore.getState().pendingRequests).toHaveLength(1)
  })

  it('deduplicates requests by requestId', () => {
    const req = { requestId: 'r1', permission: 'camera' as const, origin: 'https://example.com' }
    usePermissionStore.getState().addRequest(req)
    usePermissionStore.getState().addRequest({ ...req, permission: 'microphone' as const })
    expect(usePermissionStore.getState().pendingRequests).toHaveLength(1)
    expect(usePermissionStore.getState().pendingRequests[0].permission).toBe('microphone')
  })

  it('removes a request by id', () => {
    usePermissionStore
      .getState()
      .addRequest({ requestId: 'r1', permission: 'geolocation' as const, origin: 'https://example.com' })
    usePermissionStore.getState().removeRequest('r1')
    expect(usePermissionStore.getState().pendingRequests).toHaveLength(0)
  })
})

describe('getPermissionLabel', () => {
  it('returns label for known permissions', () => {
    expect(getPermissionLabel('geolocation')).toBe('Location')
    expect(getPermissionLabel('notifications')).toBe('Notifications')
    expect(getPermissionLabel('camera')).toBe('Camera')
    expect(getPermissionLabel('microphone')).toBe('Microphone')
  })

  it('returns the permission string for unknown permissions', () => {
    expect(getPermissionLabel('unknown-perm')).toBe('unknown-perm')
  })
})

describe('getPermissionIcon', () => {
  it('returns icon for each permission type', () => {
    expect(getPermissionIcon('geolocation')).toBeTruthy()
    expect(getPermissionIcon('camera')).toBeTruthy()
    expect(getPermissionIcon('unknown')).toBe('🔒')
  })
})
