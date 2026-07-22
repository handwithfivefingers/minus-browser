import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    run: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    transaction: vi.fn((fn: () => void) => fn()),
  },
}))

vi.mock('~/main/core/stores', () => ({
  appDb: mockDb,
}))

import { handleStorage } from '~/features/userscript/gm-api/storage'

describe('handleStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.run.mockReturnValue(undefined)
    mockDb.get.mockReturnValue(undefined)
    mockDb.query.mockReturnValue([])
  })

  it('creates gm_values table on first call', async () => {
    await handleStorage('s1', 'GM_getValue', ['key'])
    expect(mockDb.run).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS gm_values'))
  })

  describe('GM_getValue', () => {
    it('returns stored value parsed as JSON', async () => {
      mockDb.get.mockReturnValue({ value: JSON.stringify('stored') })
      const result = await handleStorage('s1', 'GM_getValue', ['key', 'default'])
      expect(result).toBe('stored')
    })

    it('returns defaultValue when key missing', async () => {
      const result = await handleStorage('s1', 'GM_getValue', ['missing', 42])
      expect(result).toBe(42)
    })

    it('supports GM.getValue alias', async () => {
      mockDb.get.mockReturnValue({ value: JSON.stringify(true) })
      const result = await handleStorage('s1', 'GM.getValue', ['flag'])
      expect(result).toBe(true)
    })

    it('returns complex objects', async () => {
      const obj = { a: [1, 2], b: null }
      mockDb.get.mockReturnValue({ value: JSON.stringify(obj) })
      const result = await handleStorage('s1', 'GM_getValue', ['obj'])
      expect(result).toEqual(obj)
    })
  })

  describe('GM_setValue', () => {
    it('inserts or replaces value', async () => {
      await handleStorage('s1', 'GM_setValue', ['key', 'value'])
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT OR REPLACE INTO gm_values (script_id, key, value) VALUES (?, ?, ?)',
        ['s1', 'key', JSON.stringify('value')]
      )
    })

    it('stores numbers', async () => {
      await handleStorage('s1', 'GM_setValue', ['count', 42])
      expect(mockDb.run).toHaveBeenCalledWith(expect.any(String), ['s1', 'count', JSON.stringify(42)])
    })

    it('supports GM.setValue alias', async () => {
      await handleStorage('s1', 'GM.setValue', ['key', true])
      expect(mockDb.run).toHaveBeenCalled()
    })
  })

  describe('GM_deleteValue', () => {
    it('deletes value by key', async () => {
      await handleStorage('s1', 'GM_deleteValue', ['key'])
      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM gm_values WHERE script_id = ? AND key = ?', ['s1', 'key'])
    })

    it('supports GM.deleteValue alias', async () => {
      await handleStorage('s1', 'GM.deleteValue', ['key'])
      expect(mockDb.run).toHaveBeenCalled()
    })
  })

  describe('GM_listValues', () => {
    it('returns all keys for script', async () => {
      mockDb.query.mockReturnValue([{ key: 'a' }, { key: 'b' }])
      const result = await handleStorage('s1', 'GM_listValues', [])
      expect(result).toEqual(['a', 'b'])
    })

    it('supports GM.listValues alias', async () => {
      mockDb.query.mockReturnValue([{ key: 'x' }])
      const result = await handleStorage('s1', 'GM.listValues', [])
      expect(result).toEqual(['x'])
    })
  })

  it('throws for unknown method', async () => {
    await expect(handleStorage('s1', 'unknown', [])).rejects.toThrow('Unknown storage method: unknown')
  })
})
