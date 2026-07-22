// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('~/main/core/stores/database', () => ({
  appDb: mockDb,
}))

vi.mock('~/main/core/stores', async (importOriginal) => {
  const original = await importOriginal()
  return { ...(original as any), appDb: mockDb }
})

import { PermissionStore } from '~/main/core/stores/permission.store'

describe('PermissionStore', () => {
  let store: PermissionStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new PermissionStore()
  })

  it('initialize loads permissions from database', async () => {
    mockDb.query.mockReturnValue([{ origin: 'https://example.com', permission: 'geolocation', decision: 'grant' }])
    await store.initialize()
    expect(mockDb.query).toHaveBeenCalledWith('SELECT origin, permission, decision FROM permissions')
  })

  it('initialize handles errors gracefully', async () => {
    mockDb.query.mockImplementation(() => {
      throw new Error('DB error')
    })
    await store.initialize()
  })

  it('getSitePermission returns "prompt" when no decision set', () => {
    mockDb.get.mockReturnValue(undefined)
    const result = store.getSitePermission('https://example.com', 'geolocation')
    expect(result).toBe('prompt')
  })

  it('getSitePermission returns the stored decision', () => {
    mockDb.get.mockReturnValue({ decision: 'grant' })
    const result = store.getSitePermission('https://example.com', 'geolocation')
    expect(result).toBe('grant')
  })

  it('getSitePermissions returns all permissions for an origin', () => {
    mockDb.query.mockReturnValue([
      { permission: 'geolocation', decision: 'grant' },
      { permission: 'camera', decision: 'deny' },
    ])
    const result = store.getSitePermissions('https://example.com')
    expect(result).toEqual({ geolocation: 'grant', camera: 'deny' })
  })

  it('setSitePermission inserts or replaces', () => {
    store.setSitePermission('https://example.com', 'geolocation', 'deny')
    expect(mockDb.run).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO permissions (origin, permission, decision) VALUES (?, ?, ?)',
      ['https://example.com', 'geolocation', 'deny']
    )
  })

  it('resetSitePermission deletes for specific permission', () => {
    store.resetSitePermission('https://example.com', 'camera')
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM permissions WHERE origin = ? AND permission = ?', [
      'https://example.com',
      'camera',
    ])
  })

  it('resetSitePermission deletes all for an origin with "*"', () => {
    store.resetSitePermission('https://example.com', '*')
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM permissions WHERE origin = ?', ['https://example.com'])
  })

  it('resetAllPermissions deletes all permissions', () => {
    store.resetAllPermissions()
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM permissions')
  })

  it('getAllSites returns distinct origins', () => {
    mockDb.query.mockReturnValue([{ origin: 'https://a.com' }, { origin: 'https://b.com' }])
    expect(store.getAllSites()).toEqual(['https://a.com', 'https://b.com'])
  })
})
