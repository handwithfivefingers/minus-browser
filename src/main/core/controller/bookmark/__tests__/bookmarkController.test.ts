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

import { Bookmark } from '~/main/core/controller/bookmark/bookmarkController'

describe('Bookmark', () => {
  let bookmark: Bookmark

  beforeEach(() => {
    vi.clearAllMocks()
    bookmark = new Bookmark()
  })

  it('starts with empty set', () => {
    expect(bookmark.bookmarks).toBeInstanceOf(Set)
    expect(bookmark.bookmarks.size).toBe(0)
  })

  it('initialize loads bookmarks from database', async () => {
    mockDb.query.mockReturnValue([{ url: 'https://example.com' }, { url: 'https://other.com' }])
    await bookmark.initialize()
    expect(bookmark.bookmarks.has('https://example.com')).toBe(true)
    expect(bookmark.bookmarks.has('https://other.com')).toBe(true)
    expect(bookmark.bookmarks.size).toBe(2)
  })

  it('initialize handles errors gracefully', async () => {
    mockDb.query.mockImplementation(() => {
      throw new Error('DB error')
    })
    await bookmark.initialize()
    expect(bookmark.bookmarks.size).toBe(0)
  })

  it('saveBookmark persists bookmarks via transaction', () => {
    mockDb.transaction.mockImplementation((fn: () => void) => fn())
    bookmark.bookmarks.add('https://a.com')
    bookmark.bookmarks.add('https://b.com')
    bookmark.saveBookmark()
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM bookmarks')
    expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO bookmarks (url, created_at) VALUES (?, ?)', [
      'https://a.com',
      expect.any(Number),
    ])
    expect(mockDb.run).toHaveBeenCalledWith('INSERT INTO bookmarks (url, created_at) VALUES (?, ?)', [
      'https://b.com',
      expect.any(Number),
    ])
  })
})
