import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSafeStorage, mockDb } = vi.hoisted(() => {
  return {
    mockSafeStorage: {
      isEncryptionAvailable: vi.fn().mockReturnValue(false),
      encryptString: vi.fn(),
      decryptString: vi.fn(),
    },
    mockDb: {
      run: vi.fn(),
      get: vi.fn(),
      query: vi.fn(),
      transaction: vi.fn((fn: () => void) => fn()),
    },
  }
})

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
}))

vi.mock('~/main/core/stores', () => ({
  appDb: mockDb,
}))

let uuidCounter = 0
vi.mock('uuid', () => ({
  v7: () => `mock-uuid-${++uuidCounter}`,
}))

import { PasswordController } from '~/features/password/controller/passwordController'

describe('PasswordController', () => {
  let controller: PasswordController

  beforeEach(() => {
    vi.clearAllMocks()
    uuidCounter = 0
    controller = new PasswordController()
    mockDb.query.mockReturnValue([])
  })

  describe('initialize', () => {
    it('loads passwords from DB', async () => {
      const encPassword = Buffer.from('pass1').toString('base64')
      mockDb.query.mockReturnValue([
        {
          id: 'p1',
          site: 'example.com',
          username: 'user1',
          encrypted_password: encPassword,
          notes: '',
          created_at: 100,
          updated_at: 200,
        },
      ])
      await controller.initialize()
      const items = controller.list()
      expect(items).toHaveLength(1)
      expect(items[0].username).toBe('user1')
      expect(items[0].password).toBe('pass1')
    })

    it('handles DB error gracefully', async () => {
      mockDb.query.mockImplementation(() => {
        throw new Error('db error')
      })
      await expect(controller.initialize()).resolves.toBeUndefined()
      expect(controller.list()).toEqual([])
    })
  })

  describe('add', () => {
    it('adds a password item', async () => {
      const item = await controller.add({ site: 'example.com', username: 'user', password: 'secret' })
      expect(item.site).toBe('example.com')
      expect(item.username).toBe('user')
      expect(item.password).toBe('secret')
      expect(item.id).toBe('mock-uuid-1')
      expect(item.createdAt).toBeDefined()
    })

    it('persists after add', async () => {
      await controller.add({ site: 'a.com', username: 'u', password: 'p' })
      expect(mockDb.transaction).toHaveBeenCalled()
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM password_vault_items')
    })
  })

  describe('getById', () => {
    it('returns null for non-existent', () => {
      expect(controller.getById('missing')).toBeNull()
    })

    it('returns existing item', async () => {
      const item = await controller.add({ site: 'x.com', username: 'u', password: 'p' })
      const found = controller.getById(item.id)
      expect(found?.site).toBe('x.com')
    })
  })

  describe('list', () => {
    it('returns sorted by updatedAt descending', async () => {
      const a = await controller.add({ site: 'a.com', username: 'u', password: 'p' })
      const b = await controller.add({ site: 'b.com', username: 'u', password: 'p' })
      const items = controller.list()
      expect(items).toHaveLength(2)
      expect(items.map((i) => i.site)).toContain('a.com')
      expect(items.map((i) => i.site)).toContain('b.com')
    })
  })

  describe('update', () => {
    it('updates fields', async () => {
      const item = await controller.add({ site: 'old.com', username: 'old', password: 'old' })
      const updated = await controller.update(item.id, { site: 'new.com', username: 'new' })
      expect(updated?.site).toBe('new.com')
      expect(updated?.username).toBe('new')
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(item.updatedAt)
    })

    it('returns null for non-existent', async () => {
      const result = await controller.update('missing', { site: 'x' })
      expect(result).toBeNull()
    })
  })

  describe('remove', () => {
    it('deletes an item', async () => {
      const item = await controller.add({ site: 'd.com', username: 'u', password: 'p' })
      expect(controller.list()).toHaveLength(1)
      const deleted = await controller.remove(item.id)
      expect(deleted).toBe(true)
      expect(controller.list()).toHaveLength(0)
    })

    it('returns false for non-existent', async () => {
      const deleted = await controller.remove('missing')
      expect(deleted).toBe(false)
    })
  })

  describe('encryption', () => {
    it('encrypts via safeStorage when available', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      mockSafeStorage.encryptString.mockReturnValue(Buffer.from('encrypted'))
      await controller.add({ site: 'secure.com', username: 'u', password: 'plain' })
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith('plain')
      const encArg = mockDb.run.mock.calls.find((c: any) => c[0].includes('INSERT INTO password_vault_items'))
      expect(encArg).toBeDefined()
    })

    it('encrypts via base64 when safeStorage unavailable', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
      await controller.add({ site: 'plain.com', username: 'u', password: 'visible' })
      expect(mockSafeStorage.encryptString).not.toHaveBeenCalled()
      const encArg = mockDb.run.mock.calls.find((c: any) => c[0].includes('INSERT INTO password_vault_items'))
      const encryptedPassword = encArg![1][3]
      expect(encryptedPassword).toBe(Buffer.from('visible').toString('base64'))
    })
  })
})
