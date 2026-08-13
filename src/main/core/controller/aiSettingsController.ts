import { app, safeStorage } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const devDataDir = path.resolve(process.cwd(), 'appData')
const resolveUserDataDir = () => {
  try {
    return app.getPath('userData')
  } catch {
    return devDataDir
  }
}
const baseDir = process.env.NODE_ENV === 'development' ? devDataDir : resolveUserDataDir()
const aiSettingsFilePath = path.join(baseDir, 'aiSettingsStore')

interface IAiSettingsFile {
  version: number
  apiKey: string
}

const DEFAULT_SHOW_FLOATING_BUTTON = true

export class AiSettingsController {
  private apiKey = ''
  private showFloatingButton = DEFAULT_SHOW_FLOATING_BUTTON
  private _initialized = false

  async initialize() {
    if (this._initialized) return
    this._initialized = true
    try {
      const file = this.readFile()
      if (file) {
        this.apiKey = file.apiKey || ''
      }
    } catch (error) {
      this._initialized = false
      console.error('failed to init ai settings store', error)
    }
  }

  getApiKey(): string {
    return this.apiKey
  }

  setApiKey(apiKey: string): void {
    this.apiKey = apiKey || ''
    this.writeFile()
  }

  getShowFloatingButton(): boolean {
    return this.showFloatingButton
  }

  setShowFloatingButton(show: boolean): void {
    this.showFloatingButton = show
  }

  private readFile(): IAiSettingsFile | null {
    let file: Buffer
    try {
      file = fs.readFileSync(aiSettingsFilePath)
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
      // file may have been written in plaintext when encryption was unavailable
      json = file.toString('utf-8')
    }
    try {
      const parsed = JSON.parse(json)
      if (!parsed || typeof parsed !== 'object') return null
      return parsed as IAiSettingsFile
    } catch {
      return null
    }
  }

  private writeFile() {
    const json = JSON.stringify({ version: 1, apiKey: this.apiKey })
    const data = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(json) : Buffer.from(json, 'utf-8')
    fs.mkdirSync(path.dirname(aiSettingsFilePath), { recursive: true })
    fs.writeFileSync(aiSettingsFilePath, data)
  }
}

export const aiSettingsController = new AiSettingsController()
