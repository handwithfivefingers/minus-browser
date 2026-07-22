import { safeStorage } from 'electron'

import { v7 as uuid_v7 } from 'uuid'

import { cacheSystem } from '~/features/cacheSystem'
import { appDb } from '~/main/core/stores'

import { IPasswordItem } from '../../../shared/types/password'

export class PasswordController {
  private items: Map<string, IPasswordItem> = new Map()
  private _initialized = false

  async initialize() {
    if (this._initialized) return
    this._initialized = true
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
      this.items = new Map(
        rows.map((r) => [
          r.id,
          {
            id: r.id,
            site: r.site,
            username: r.username,
            password: this.decryptString(r.encrypted_password),
            notes: r.notes,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
          } as IPasswordItem,
        ])
      )
    } catch (error) {
      this._initialized = false
      console.error('failed to init', error)
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
    try {
      const list = [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt)
      appDb.transaction(() => {
        appDb.run('DELETE FROM password_vault_items')
        for (const item of list) {
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
      cacheSystem.set('passwordVault', { vault: { cipherText: '', isEncrypted: false } })
    } catch (error) {
      console.error('persit vault error', error)
    }
  }

  async list() {
    await this.initialize()
    return [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getById(id: string) {
    return this.items.get(id) || null
  }

  async add(input: Pick<IPasswordItem, 'site' | 'username' | 'password' | 'notes'>) {
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
    try {
      const current = this.items.get(id)
      if (!current) return this.add(patch as IPasswordItem)
      const next: IPasswordItem = {
        ...current,
        ...patch,
        updatedAt: Date.now(),
      }
      this.items.set(id, next)
      await this.persist()
      return next
    } catch (error) {
      console.error('update Vault Password ', error)
    }
  }

  async remove(id: string) {
    this.items.delete(id)
    await this.persist()
    return true
  }
}
