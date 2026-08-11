import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { v7 as uuid_v7 } from 'uuid'

import { appDb } from '~/main/core/stores'

import { IPasswordItem } from '../../../shared/types/password'

const devDataDir = path.resolve(process.cwd(), 'appData')
const resolveUserDataDir = () => {
  try {
    return app.getPath('userData')
  } catch {
    return devDataDir
  }
}
const baseDir = process.env.NODE_ENV === 'development' ? devDataDir : resolveUserDataDir()
const passwordFilePath = path.join(baseDir, 'passwordStore')

/*
file format:
{
  version: 1,
  credentials: [
    {
      id,
      site,
      username,
      password,
      notes,
      createdAt,
      updatedAt
    }
  ]
}
*/

interface IPasswordFile {
  version: number
  credentials: IPasswordItem[]
}

function normalizeDomain(input: string): string {
  let value = (input || '').toLowerCase().trim()
  try {
    if (/^https?:\/\//.test(value)) {
      value = new URL(value).hostname
    } else {
      value = value.split('/')[0].split(':')[0]
    }
  } catch {
    // keep the raw value
  }
  return value.replace(/^www\./, '')
}

export class PasswordController {
  private items: Map<string, IPasswordItem> = new Map()
  private _initialized = false

  async initialize() {
    if (this._initialized) return
    this._initialized = true
    try {
      const file = this.readFile()
      if (file) {
        this.items = new Map(file.credentials.map((item) => [item.id, item]))
      } else {
        await this.migrateFromSqlite()
      }
    } catch (error) {
      this._initialized = false
      console.error('failed to init password store', error)
    }
  }

  private readFile(): IPasswordFile | null {
    let file: Buffer
    try {
      file = fs.readFileSync(passwordFilePath)
    } catch {
      return null
    }
    let json = ''
    try {
      if (safeStorage.isEncryptionAvailable()) {
        json = safeStorage.decryptString(file)
      } else {
        json = file.toString('utf-8')
      }
    } catch {
      // file may have been written in plaintext/base64 when encryption was unavailable
      json = file.toString('utf-8')
    }
    try {
      const parsed = JSON.parse(json)
      if (!parsed || !Array.isArray(parsed.credentials)) return null
      return parsed as IPasswordFile
    } catch {
      return null
    }
  }

  private writeFile(list: IPasswordItem[]) {
    const json = JSON.stringify({ version: 1, credentials: list })
    const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf-8')
    fs.mkdirSync(path.dirname(passwordFilePath), { recursive: true })
    fs.writeFileSync(passwordFilePath, data)
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

  private async migrateFromSqlite() {
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
      const items = rows
        .map((r) => ({
          id: r.id,
          site: r.site,
          username: r.username,
          password: this.decryptString(r.encrypted_password),
          notes: r.notes,
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        }))
        .filter((item) => item.id)
      if (items.length > 0) {
        this.items = new Map(items.map((item) => [item.id, item]))
        this.writeFile(items)
      }
    } catch (error) {
      console.error('failed to migrate password vault from sqlite', error)
    }
  }

  private async persist() {
    try {
      const list = [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt)
      this.writeFile(list)
    } catch (error) {
      console.error('persist password store error', error)
    }
  }

  async list() {
    await this.initialize()
    return [...this.items.values()].sort((a, b) => b.updatedAt - a.updatedAt)
  }

  getById(id: string) {
    return this.items.get(id) || null
  }

  async getByDomain(domain: string): Promise<IPasswordItem[]> {
    await this.initialize()
    const normalized = normalizeDomain(domain)
    if (!normalized) return []
    return [...this.items.values()].filter((item) => {
      const site = normalizeDomain(item.site)
      return site === normalized || site.endsWith(`.${normalized}`) || normalized.endsWith(`.${site}`)
    })
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
      console.error('update password store ', error)
    }
  }

  async remove(id: string) {
    if (!this.items.has(id)) return false
    this.items.delete(id)
    await this.persist()
    return true
  }

  async setAll(credentials: Array<Pick<IPasswordItem, 'site' | 'username' | 'password' | 'notes'>>) {
    const now = Date.now()
    this.items = new Map(
      credentials.map((input) => {
        const item: IPasswordItem = {
          id: uuid_v7(),
          site: input.site,
          username: input.username,
          password: input.password,
          notes: input.notes || '',
          createdAt: now,
          updatedAt: now,
        }
        return [item.id, item]
      })
    )
    await this.persist()
    return [...this.items.values()]
  }
}

export const passwordController = new PasswordController()
