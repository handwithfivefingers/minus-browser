import path from 'node:path'

import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockSafeStorage, mockFs, mockDb } = vi.hoisted(() => {
  const fsMock = {
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  }
  const dbMock = {
    query: vi.fn(),
  }
  return {
    mockSafeStorage: {
      isEncryptionAvailable: vi.fn().mockReturnValue(false),
      encryptString: vi.fn((input: string) => Buffer.from(`enc:${input}`, 'utf-8')),
      decryptString: vi.fn((input: Buffer) => input.toString('utf-8').replace(/^enc:/, '')),
    },
    mockFs: fsMock,
    mockDb: dbMock,
  }
})

vi.mock('electron', () => ({
  safeStorage: mockSafeStorage,
  app: {
    getPath: () => '/mock-user-data',
  },
}))

vi.mock('node:fs', () => ({ ...mockFs, default: mockFs }))

vi.mock('~/main/core/stores', () => ({
  appDb: mockDb,
}))

let uuidCounter = 0
vi.mock('uuid', () => ({
  v7: () => `mock-uuid-${++uuidCounter}`,
}))

import { PasswordController } from '~/features/vault/controllers/passwordController'

const storePath = path.join('/mock-user-data', 'passwordStore')

describe('PasswordController', () => {
  let controller: PasswordController

  beforeEach(() => {
    vi.resetAllMocks()
    mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
    mockSafeStorage.encryptString.mockImplementation((input: string) => Buffer.from(`enc:${input}`, 'utf-8'))
    mockSafeStorage.decryptString.mockImplementation((input: Buffer) => input.toString('utf-8').replace(/^enc:/, ''))
    uuidCounter = 0
    controller = new PasswordController()
    mockFs.readFileSync.mockImplementation(() => {
      throw new Error('ENOENT')
    })
    mockFs.writeFileSync.mockImplementation(() => undefined)
    mockFs.mkdirSync.mockImplementation(() => undefined)
    mockDb.query.mockReturnValue([])
  })

  describe('initialize', () => {
    it('loads passwords from file when encryption is available', async () => {
      const items = [
        {
          id: 'p1',
          site: 'example.com',
          username: 'user1',
          password: 'pass1',
          notes: '',
          createdAt: 100,
          updatedAt: 200,
        },
      ]
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      mockSafeStorage.decryptString.mockReturnValue(JSON.stringify({ version: 1, credentials: items }))
      mockFs.readFileSync.mockReturnValue(Buffer.from('encrypted-blob'))
      await controller.initialize()
      expect(await controller.list()).toHaveLength(1)
      expect(controller.getById('p1')?.password).toBe('pass1')
    })

    it('decrypts the file via safeStorage when encryption is available', async () => {
      const items = [
        { id: 'p1', site: 'example.com', username: 'u', password: 'secret', notes: '', createdAt: 1, updatedAt: 2 },
      ]
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(Buffer.from('whatever'))
      mockSafeStorage.decryptString.mockReturnValue(JSON.stringify({ version: 1, credentials: items }))
      await controller.initialize()
      expect(controller.getById('p1')?.password).toBe('secret')
    })

    it('returns empty store when encryption is unavailable (no plaintext fallback)', async () => {
      const items = [
        { id: 'p1', site: 'example.com', username: 'u', password: 'plain', notes: '', createdAt: 1, updatedAt: 2 },
      ]
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify({ version: 1, credentials: items })))
      await controller.initialize()
      expect(await controller.list()).toEqual([])
    })

    it('returns empty store when decryption fails', async () => {
      const items = [
        { id: 'p1', site: 'example.com', username: 'u', password: 'plain', notes: '', createdAt: 1, updatedAt: 2 },
      ]
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify({ version: 1, credentials: items })))
      mockSafeStorage.decryptString.mockImplementation(() => {
        throw new Error('decrypt failed')
      })
      await controller.initialize()
      expect(await controller.list()).toEqual([])
    })

    it('migrates from sqlite when no file exists', async () => {
      const encPassword = Buffer.from('enc:pass1').toString('base64')
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
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
      const items = await controller.list()
      expect(items).toHaveLength(1)
      expect(items[0].username).toBe('user1')
      expect(items[0].password).toBe('pass1')
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(storePath, expect.any(Buffer))
    })

    it('handles DB error gracefully', async () => {
      mockDb.query.mockImplementation(() => {
        throw new Error('db error')
      })
      await expect(controller.initialize()).resolves.toBeUndefined()
      expect(await controller.list()).toEqual([])
    })
  })

  describe('add', () => {
    it('adds a password item and persists to file', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      const item = await controller.add({ site: 'example.com', username: 'user', password: 'secret' })
      expect(item.site).toBe('example.com')
      expect(item.username).toBe('user')
      expect(item.password).toBe('secret')
      expect(item.id).toBe('mock-uuid-1')
      expect(item.createdAt).toBeDefined()
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(storePath, expect.any(Buffer))
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

  describe('getByDomain', () => {
    it('normalizes www and scheme', async () => {
      await controller.add({ site: 'https://www.example.com/login', username: 'u', password: 'p' })
      expect(await controller.getByDomain('example.com')).toHaveLength(1)
      expect(await controller.getByDomain('www.example.com')).toHaveLength(1)
      expect(await controller.getByDomain('https://example.com')).toHaveLength(1)
    })

    it('matches parent and subdomains', async () => {
      await controller.add({ site: 'example.com', username: 'u', password: 'p' })
      await controller.add({ site: 'mail.example.com', username: 'u', password: 'p' })
      expect(await controller.getByDomain('example.com')).toHaveLength(2)
      expect(await controller.getByDomain('mail.example.com')).toHaveLength(2)
    })

    it('returns empty for unrelated domains', async () => {
      await controller.add({ site: 'example.com', username: 'u', password: 'p' })
      expect(await controller.getByDomain('other.com')).toEqual([])
    })
  })

  describe('list', () => {
    it('returns sorted by updatedAt descending', async () => {
      const a = await controller.add({ site: 'a.com', username: 'u', password: 'p' })
      const b = await controller.add({ site: 'b.com', username: 'u', password: 'p' })
      await controller.update(a.id, { username: 'u2' })
      const items = await controller.list()
      expect(items).toHaveLength(2)
      expect(items[0].id).toBe(a.id)
      expect(items[1].id).toBe(b.id)
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

    it('creates a new item when id does not exist', async () => {
      const created = await controller.update('missing', { site: 'x.com', username: 'u', password: 'p' })
      expect(created).not.toBeNull()
      expect(created?.id).not.toBe('missing')
      expect(controller.getById('missing')).toBeNull()
    })
  })

  describe('remove', () => {
    it('deletes an item', async () => {
      const item = await controller.add({ site: 'd.com', username: 'u', password: 'p' })
      expect(await controller.list()).toHaveLength(1)
      const deleted = await controller.remove(item.id)
      expect(deleted).toBe(true)
      expect(await controller.list()).toHaveLength(0)
    })

    it('returns false for non-existent', async () => {
      const deleted = await controller.remove('missing')
      expect(deleted).toBe(false)
    })
  })

  describe('setAll', () => {
    it('replaces the whole store', async () => {
      await controller.add({ site: 'old.com', username: 'u', password: 'p' })
      const result = await controller.setAll([
        { site: 'n1.com', username: 'u', password: 'p' },
        { site: 'n2.com', username: 'u', password: 'p' },
      ])
      expect(result).toHaveLength(2)
      expect(await controller.list()).toHaveLength(2)
    })
  })

  describe('encryption', () => {
    it('encrypts the persisted file via safeStorage when available', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(true)
      await controller.add({ site: 'secure.com', username: 'u', password: 'plain' })
      expect(mockSafeStorage.encryptString).toHaveBeenCalledWith(expect.stringContaining('secure.com'))
    })

    it('never writes credentials to disk when safeStorage is unavailable', async () => {
      mockSafeStorage.isEncryptionAvailable.mockReturnValue(false)
      await controller.add({ site: 'plain.com', username: 'u', password: 'visible' })
      expect(mockFs.writeFileSync).not.toHaveBeenCalled()
      expect(await controller.list()).toHaveLength(1)
    })
  })
})
