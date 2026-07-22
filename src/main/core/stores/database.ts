import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { DatabaseSync } from 'node:sqlite'

import { runMigrations } from './migrations'

const devDataDir = path.resolve(process.cwd(), 'appData')
const resolveUserDataDir = () => {
  try {
    return app.getPath('userData')
  } catch {
    return devDataDir
  }
}
const baseDir = process.env.NODE_ENV === 'development' ? devDataDir : resolveUserDataDir()

class AppDatabase {
  private db: DatabaseSync

  constructor() {
    fs.mkdirSync(baseDir, { recursive: true })
    this.db = new DatabaseSync(path.join(baseDir, 'minus-browser.db'))
    this.db.exec('PRAGMA journal_mode = WAL')
    this.db.exec('PRAGMA foreign_keys = ON')
    this.db.exec('PRAGMA busy_timeout = 5000')
    runMigrations(this.db)
    this.migrateFromJsonFiles()
  }

  query<T>(sql: string, params?: any[]): T[] {
    return this.db.prepare(sql).all(...(params || [])) as unknown as T[]
  }

  get<T>(sql: string, params?: any[]): T | undefined {
    return this.db.prepare(sql).get(...(params || [])) as unknown as T | undefined
  }

  run(sql: string, params?: any[]): void {
    this.db.prepare(sql).run(...(params || []))
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN')
    try {
      const result = fn()
      this.db.exec('COMMIT')
      return result
    } catch (e) {
      this.db.exec('ROLLBACK')
      throw e
    }
  }

  close(): void {
    this.db.close()
  }

  getBaseDir(): string {
    return baseDir
  }

  private migrateFromJsonFiles() {
    const files: { file: string; migrate: (data: any) => void }[] = [
      { file: 'bookmark.json', migrate: (data) => this.migrateBookmark(data) },
      { file: 'history.json', migrate: (data) => this.migrateHistory(data) },
      { file: 'userData.json', migrate: (data) => this.migrateUserData(data) },
      { file: 'interface.json', migrate: (data) => this.migrateInterface(data) },
      { file: 'permission.json', migrate: (data) => this.migratePermission(data) },
      { file: 'passwordVault.json', migrate: (data) => this.migratePasswordVault(data) },
      { file: 'translate.json', migrate: (data) => this.migrateTranslate(data) },
      { file: 'userscripts.json', migrate: (data) => this.migrateUserscripts(data) },
    ]

    for (const { file, migrate } of files) {
      const jsonPath = path.join(baseDir, file)
      if (!fs.existsSync(jsonPath)) continue
      const content = fs.readFileSync(jsonPath, 'utf-8')
      if (!content.trim()) {
        fs.renameSync(jsonPath, jsonPath + '.migrated')
        continue
      }
      try {
        const data = JSON.parse(content)
        this.transaction(() => migrate(data))
        fs.renameSync(jsonPath, jsonPath + '.migrated')
      } catch (err) {
        console.error(`Migration failed for ${file}:`, err)
      }
    }
  }

  private migrateBookmark(data: Record<string, string[]>) {
    const urls = data?.bookmark || []
    const insert = this.db.prepare('INSERT OR IGNORE INTO bookmarks (url, created_at) VALUES (?, ?)')
    const now = Date.now()
    for (const url of urls) {
      insert.run(url, now)
    }
  }

  private migrateHistory(data: any[]) {
    const entries = Array.isArray(data) ? data : []
    const insert = this.db.prepare(
      'INSERT OR IGNORE INTO history_entries (id, url, title, favicon, timestamp, visit_count) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const entry of entries) {
      if (entry?.url) {
        insert.run(
          entry.id || '',
          entry.url,
          entry.title || '',
          entry.favicon || '',
          entry.timestamp || Date.now(),
          entry.visitCount || 1
        )
      }
    }
  }

  private migrateUserData(data: any) {
    if (!data || typeof data !== 'object') return
    const { tabs, index, activeTabId, tabGroups } = data
    console.log('tabs', tabs)
    if (Array.isArray(tabs)) {
      const insertTab = this.db.prepare(`
        INSERT OR REPLACE INTO tabs (id, title, url, is_pinned, is_focused, "index", favicon, timestamp, is_bookmarked, is_hibernated, prevent_hibernate, group_id, audible, is_muted, is_using_camera, is_using_microphone, is_using_screen_share, blocked_notifications, error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const tab of tabs) {
        if (tab?.id) {
          insertTab.run(
            tab.id,
            tab.title || '',
            tab.url || '',
            tab.isPinned ? 1 : 0,
            tab.isFocused ? 1 : 0,
            tab.index ?? 0,
            tab.favicon || '',
            tab.timestamp || Date.now(),
            tab.isBookmarked ? 1 : 0,
            tab.isHibernated ? 1 : 0,
            tab.preventHibernate ? 1 : 0,
            tab.groupId || null,
            tab.audible ? 1 : 0,
            tab.isMuted ? 1 : 0,
            tab.isUsingCamera ? 1 : 0,
            tab.isUsingMicrophone ? 1 : 0,
            tab.isUsingScreenShare ? 1 : 0,
            tab.blockedNotifications ? JSON.stringify(tab.blockedNotifications) : null,
            tab.error ? JSON.stringify(tab.error) : null
          )
        }
      }
    }

    if (index !== undefined) {
      this.db
        .prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)')
        .run('tab_index', JSON.stringify(index))
    }
    if (activeTabId !== undefined) {
      this.db
        .prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)')
        .run('active_tab_id', JSON.stringify(activeTabId))
    }

    if (Array.isArray(tabGroups)) {
      const insertGroup = this.db.prepare(`
        INSERT OR REPLACE INTO tab_groups (id, name, color, hidden, collapsed, created_at, updated_at, tab_ids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const group of tabGroups) {
        if (group?.id) {
          insertGroup.run(
            group.id,
            group.name || '',
            group.color || '#6366f1',
            group.hidden ? 1 : 0,
            group.collapsed ? 1 : 0,
            group.createdAt || Date.now(),
            group.updatedAt || Date.now(),
            JSON.stringify(group.tabIds || [])
          )
        }
      }
    }
  }

  private migrateInterface(data: any) {
    if (!data || typeof data !== 'object') return
    const insert = this.db.prepare('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)')
    for (const [key, value] of Object.entries(data)) {
      insert.run(`ui_${key}`, JSON.stringify(value))
    }
  }

  private migratePermission(data: Record<string, Record<string, string>>) {
    if (!data || typeof data !== 'object') return
    const insert = this.db.prepare('INSERT OR REPLACE INTO permissions (origin, permission, decision) VALUES (?, ?, ?)')
    for (const [origin, perms] of Object.entries(data)) {
      if (perms && typeof perms === 'object') {
        for (const [permission, decision] of Object.entries(perms)) {
          insert.run(origin, permission, decision)
        }
      }
    }
  }

  private migratePasswordVault(data: any) {
    if (!data?.vault) return
    const payload = data.vault
    if (!payload?.cipherText) return

    let decrypted: string | null = null
    const cipher = Buffer.from(payload.cipherText, 'base64')
    try {
      if (payload.isEncrypted && safeStorage.isEncryptionAvailable()) {
        decrypted = safeStorage.decryptString(cipher)
      } else {
        decrypted = cipher.toString('utf-8')
      }
    } catch {
      console.error('Cannot decrypt password vault — safeStorage unavailable or key mismatch')
      return
    }

    if (!decrypted) return
    let items: any[]
    try {
      items = JSON.parse(decrypted)
    } catch {
      console.error('Failed to parse decrypted password vault')
      return
    }
    if (!Array.isArray(items)) return

    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO password_vault_items (id, site, username, encrypted_password, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const item of items) {
      if (item?.id) {
        const encrypted = safeStorage.isEncryptionAvailable()
          ? safeStorage.encryptString(item.password || '').toString('base64')
          : Buffer.from(item.password || '', 'utf-8').toString('base64')
        insert.run(
          item.id,
          item.site || '',
          item.username || '',
          encrypted,
          item.notes || '',
          item.createdAt || Date.now(),
          item.updatedAt || Date.now()
        )
      }
    }
  }

  private migrateTranslate(data: any) {
    if (!data || typeof data !== 'object') return
    const { preference, recentSelections } = data

    if (preference && typeof preference === 'object') {
      const insert = this.db.prepare('INSERT OR REPLACE INTO translate_preferences (key, value) VALUES (?, ?)')
      for (const [key, value] of Object.entries(preference)) {
        insert.run(key, JSON.stringify(value))
      }
    }

    if (Array.isArray(recentSelections)) {
      const insert = this.db.prepare(`
        INSERT OR REPLACE INTO translate_recent_selections (id, tab_id, source_text, translated_text, source_language, target_language, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const sel of recentSelections) {
        if (sel?.id) {
          insert.run(
            sel.id,
            sel.tabId || '',
            sel.sourceText || '',
            sel.translatedText || '',
            sel.sourceLanguage || '',
            sel.targetLanguage || '',
            sel.createdAt || Date.now()
          )
        }
      }
    }
  }

  private migrateUserscripts(data: any) {
    if (!data?.scripts || !Array.isArray(data.scripts)) return
    const insert = this.db.prepare(`
      INSERT OR REPLACE INTO user_scripts (id, name, source, enabled, matches, excludes, run_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const script of data.scripts) {
      if (script?.id) {
        insert.run(
          script.id,
          script.name || '',
          script.source || '',
          script.enabled ? 1 : 0,
          JSON.stringify(script.matches || []),
          JSON.stringify(script.excludes || []),
          script.runAt || 'document-start',
          script.createdAt || Date.now(),
          script.updatedAt || Date.now()
        )
      }
    }
  }
}

export const appDb = new AppDatabase()
