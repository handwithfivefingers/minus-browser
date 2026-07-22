import { safeStorage } from 'electron'

import { v7 as uuid_v7 } from 'uuid'

import { appDb } from '~/main/core/stores'

import { IPasswordItem } from '../interfaces/password'

export class PasswordController {
  private items: Map<string, IPasswordItem> = new Map()

  async initialize() {
    try {
      const rows = appDb.query<{
        id: string
        site: string
        username: string
        encrypted_password: string
        notes: string
        created_at: number
        updated_at: number
      }>('SELECT * FROM password_vault_items')
      this.items = new Map()
      for (const row of rows) {
        const password = this.decryptString(row.encrypted_password)
        this.items.set(row.id, {
          id: row.id,
          site: row.site,
          username: row.username,
          password,
          notes: row.notes,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        })
      }
    } catch {
      this.items = new Map()
    }
  }

  private decryptString(encrypted: string): string {
    if (!encrypted) return ''
    try {
      const cipher = Buffer.from(encrypted, 'base64')
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(cipher)
      }
      return cipher.toString('utf-8')
    } catch {
      return ''
    }
  }

  private encryptString(password: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(password).toString('base64')
    }
    return Buffer.from(password, 'utf-8').toString('base64')
  }

  private async persist() {
    appDb.transaction(() => {
      appDb.run('DELETE FROM password_vault_items')
      for (const item of this.items.values()) {
        appDb.run(
          'INSERT INTO password_vault_items (id, site, username, encrypted_password, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [
            item.id,
            item.site,
            item.username,
            this.encryptString(item.password),
            item.notes || '',
            item.createdAt,
            item.updatedAt,
          ]
        )
      }
    })
  }

  list() {
    return [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getById(id: string) {
    return this.items.get(id) || null
  }

  async add(input: { site: string; username: string; password: string; notes?: string }) {
    const now = Date.now()
    const item: IPasswordItem = {
      id: uuid_v7(),
      site: input.site,
      username: input.username,
      password: input.password,
      notes: input.notes || '',
      createdAt: now,
      updatedAt: now,
    }
    this.items.set(item.id, item)
    await this.persist()
    return item
  }

  async update(id: string, patch: Partial<Pick<IPasswordItem, 'site' | 'username' | 'password' | 'notes'>>) {
    const current = this.items.get(id)
    if (!current) return null
    const next: IPasswordItem = {
      ...current,
      ...patch,
      updatedAt: Date.now(),
    }
    this.items.set(id, next)
    await this.persist()
    return next
  }

  async remove(id: string) {
    const deleted = this.items.delete(id)
    await this.persist()
    return deleted
  }
}
