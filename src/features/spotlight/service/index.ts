import { BrowserWindow, session, WebContentsView } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Tab } from '~/features/tabs/models/tab'
import { IHistoryEntry } from '~/main/core/controller/history'

type SpotlightOpenPayload = {
  query?: string
  tabs?: ReturnType<Tab['toJSON']>[]
  activeTabId?: string
  history?: IHistoryEntry[]
}

const preloadPath = path.join(__dirname, '/preload.js')

export class SpotlightService {
  isOpen = false
  private mainWindow: BrowserWindow | null = null
  private view: WebContentsView | null = null
  private resizeHandler: (() => void) | null = null
  private blurHandler: (() => void) | null = null

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  private getSpotlightURL() {
    /**@ts-ignore */
    if (SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      return SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL
    }
    const filePath = path.join(__dirname, `../renderer/spotlight_window/index.html`)
    return pathToFileURL(filePath).toString()
  }

  private syncViewBounds() {
    if (!this.mainWindow || !this.view) return
    const { width, height } = this.mainWindow.getBounds()
    this.view.setBounds({ x: 0, y: 0, width, height })
  }

  async warmup() {
    if (this.view) return
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        backgroundThrottling: false,
        session: session.fromPartition('minus-spotlight'),
      },
    })
    this.view.setBackgroundColor('#00000000')
    this.view.webContents.loadURL(this.getSpotlightURL()).catch(() => {})
    if (this.view.webContents.isLoading()) {
      await new Promise<void>((resolve) => this.view!.webContents.once('did-finish-load', resolve))
    }
  }

  async openSpotlight(payload?: SpotlightOpenPayload) {
    if (!this.mainWindow || !this.view) {
      await this.warmup()
      if (!this.mainWindow || !this.view) return
    }

    this.syncViewBounds()
    this.mainWindow.contentView.addChildView(this.view)

    this.view.webContents.send('GET_TABS', payload?.tabs || [])
    this.view.webContents.send('GET_HISTORY', payload?.history || [])
    this.view.webContents.send('SPOTLIGHT_OPEN', {
      query: payload?.query || '',
      activeTabId: payload?.activeTabId,
    })
    this.view.webContents.focus()

    this.isOpen = true

    this.resizeHandler = () => this.syncViewBounds()
    this.mainWindow.on('resize', this.resizeHandler)

    this.blurHandler = () => this.close()
    this.mainWindow.on('blur', this.blurHandler)
  }

  syncTabs(tabs: ReturnType<Tab['toJSON']>[]) {
    if (!this.view) return
    this.view.webContents.send('GET_TABS', tabs)
  }

  close() {
    if (!this.isOpen || !this.mainWindow || !this.view) return
    this.isOpen = false

    if (this.resizeHandler) {
      this.mainWindow.off('resize', this.resizeHandler)
      this.resizeHandler = null
    }

    if (this.blurHandler) {
      this.mainWindow.off('blur', this.blurHandler)
      this.blurHandler = null
    }

    try {
      this.mainWindow.contentView.removeChildView(this.view)
    } catch {}
  }

  destroy() {
    this.close()
    if (this.view) {
      this.view.webContents.close()
      this.view = null
    }
  }
}
