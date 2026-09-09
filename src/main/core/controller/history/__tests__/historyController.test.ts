// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn((fn: () => unknown) => fn()),
  },
}))

vi.mock('~/main/core/stores/database', () => ({
  appDb: mockDb,
}))

vi.mock('~/main/core/stores', async (importOriginal) => {
  const original = await importOriginal()
  return { ...(original as any), appDb: mockDb }
})

import { History } from '../historyController'

describe('History', () => {
  let history: History

  beforeEach(() => {
    vi.clearAllMocks()
    history = new History()
  })

  it('has default retention days', () => {
    expect(history.retentionDays).toBe(30)
  })

  it('setRetentionDays updates retention', () => {
    history.setRetentionDays(90)
    expect(history.retentionDays).toBe(90)
  })

  it('setRetentionDays clamps to default for invalid values', () => {
    history.setRetentionDays(0)
    expect(history.retentionDays).toBe(30)
    history.setRetentionDays(-5)
    expect(history.retentionDays).toBe(30)
  })

  it('cleanOldEntries deletes old entries', () => {
    history.retentionDays = 7
    history.cleanOldEntries()
    expect(mockDb.run).toHaveBeenCalled()
    const cutoff = mockDb.run.mock.calls[0][1][0]
    expect(typeof cutoff).toBe('number')
    expect(cutoff).toBeLessThan(Date.now())
  })

  it('addEntry creates new entry when URL not found', () => {
    mockDb.get.mockReturnValue(undefined)
    history.addEntry('https://example.com', 'Example', 'https://example.com/favicon.ico')
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO history_entries'),
      expect.arrayContaining([expect.any(String), 'https://example.com', 'Example', 'https://example.com/favicon.ico'])
    )
  })

  it('addEntry updates existing entry when URL found', () => {
    mockDb.get.mockReturnValue({ id: 'existing-id', timestamp: Date.now(), visit_count: 5 })
    history.addEntry('https://example.com', 'Example', 'favicon.ico')
    expect(mockDb.run).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE history_entries'),
      expect.arrayContaining([expect.any(Number), 'Example', 'favicon.ico', 'existing-id'])
    )
  })

  it('getAll queries all entries ordered by timestamp', () => {
    history.getAll()
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.stringContaining('SELECT id, url, title, favicon, timestamp, visit_count as visitCount')
    )
  })

  it('search queries with LIKE pattern', () => {
    history.search('example')
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LOWER(title) LIKE ? OR LOWER(url) LIKE ?'), [
      '%example%',
      '%example%',
    ])
  })

  it('getRecent queries with limit', () => {
    history.getRecent(5)
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [5])
  })

  it('getRecent defaults to limit 10', () => {
    history.getRecent()
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT ?'), [10])
  })

  it('updateEntryMetadata updates title when provided', () => {
    mockDb.get.mockReturnValue({ id: 'existing-id' })
    history.updateEntryMetadata('https://example.com', 'New Title')
    expect(mockDb.run).toHaveBeenCalledWith('UPDATE history_entries SET title = ? WHERE id = ?', [
      'New Title',
      'existing-id',
    ])
  })

  it('updateEntryMetadata updates favicon when provided', () => {
    mockDb.get.mockReturnValue({ id: 'existing-id' })
    history.updateEntryMetadata('https://example.com', undefined, 'new-icon.ico')
    expect(mockDb.run).toHaveBeenCalledWith('UPDATE history_entries SET favicon = ? WHERE id = ?', [
      'new-icon.ico',
      'existing-id',
    ])
  })

  it('deleteEntry deletes by id', () => {
    history.deleteEntry('entry-id')
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM history_entries WHERE id = ?', ['entry-id'])
  })

  it('clearAll deletes all entries', () => {
    history.clearAll()
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM history_entries')
  })
})
