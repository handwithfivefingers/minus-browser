import { v7 as uuid_v7 } from 'uuid'

import { appDb } from '~/main/core/stores'

import { IHistoryEntry } from './types'

const CLEANUP_INTERVAL_MS = 3600000
const DEFAULT_RETENTION_DAYS = 30

export class History {
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  retentionDays: number = DEFAULT_RETENTION_DAYS

  async initialize() {
    this.cleanOldEntries()
    this.startCleanupTimer()
  }

  setRetentionDays(days: number) {
    this.retentionDays = days > 0 ? days : DEFAULT_RETENTION_DAYS
  }

  cleanOldEntries() {
    const cutoff = Date.now() - this.retentionDays * 86400000
    appDb.run('DELETE FROM history_entries WHERE timestamp < ?', [cutoff])
  }

  private startCleanupTimer() {
    this.stopCleanupTimer()
    this.cleanupTimer = setInterval(() => this.cleanOldEntries(), CLEANUP_INTERVAL_MS)
  }

  private stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
  }

  addEntry(url: string, title: string, favicon: string): void {
    const now = Date.now()
    const existing = appDb.get<{ id: string; visit_count: number }>(
      'SELECT id, visit_count FROM history_entries WHERE url = ?',
      [url]
    )
    if (existing) {
      appDb.run(
        'UPDATE history_entries SET visit_count = visit_count + 1, timestamp = ?, title = ?, favicon = ? WHERE url = ?',
        [now, title || '', favicon || '', url]
      )
    } else {
      appDb.run(
        'INSERT INTO history_entries (id, url, title, favicon, timestamp, visit_count) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid_v7(), url, title || url, favicon || '', now, 1]
      )
    }
  }

  getAll(): IHistoryEntry[] {
    return appDb.query<IHistoryEntry>(
      'SELECT id, url, title, favicon, timestamp, visit_count as visitCount FROM history_entries ORDER BY timestamp DESC'
    )
  }

  search(query: string): IHistoryEntry[] {
    const lower = `%${query.toLowerCase()}%`
    return appDb.query<IHistoryEntry>(
      'SELECT id, url, title, favicon, timestamp, visit_count as visitCount FROM history_entries WHERE LOWER(title) LIKE ? OR LOWER(url) LIKE ? ORDER BY timestamp DESC',
      [lower, lower]
    )
  }

  getRecent(limit = 10): IHistoryEntry[] {
    return appDb.query<IHistoryEntry>(
      'SELECT id, url, title, favicon, timestamp, visit_count as visitCount FROM history_entries ORDER BY timestamp DESC LIMIT ?',
      [limit]
    )
  }

  updateEntryMetadata(url: string, title?: string, favicon?: string): void {
    if (title) {
      appDb.run('UPDATE history_entries SET title = ? WHERE url = ?', [title, url])
    }
    if (favicon) {
      appDb.run('UPDATE history_entries SET favicon = ? WHERE url = ?', [favicon, url])
    }
  }

  deleteEntry(id: string): void {
    appDb.run('DELETE FROM history_entries WHERE id = ?', [id])
  }

  clearAll(): void {
    appDb.run('DELETE FROM history_entries')
  }
}
