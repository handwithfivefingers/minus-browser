import { BrowserWindow, session, WebContentsView } from 'electron'
import path from 'node:path'

import { getSubWindowURL } from '~/features/sub-window/service'
import { DownloadItem } from '~/shared/types/download'

const preloadPath = path.join(__dirname, '/preload.js')

const POPUP_HEIGHT = 118
const POPUP_MAX_WIDTH = 720
const POPUP_MARGIN = 12
const AUTO_HIDE_DELAY = 8000

/**
 * Bottom-docked popup that hosts the download shelf. Unlike the full-screen
 * sub-window overlay (Spotlight / Media List) this is a small bounded
 * WebContentsView, so the page behind it stays interactive while downloads run.
 *
 * The shelf UI lives in the sub-window renderer and is loaded directly at its
 * `#/downloads` overlay route.
 */
export class DownloadPopupService {
  private mainWindow: BrowserWindow | null = null
  private view: WebContentsView | null = null
  private initialized = false
  private readyPromise: Promise<void> | null = null
  private hideTimer: ReturnType<typeof setTimeout> | null = null
  private resizeHandler: (() => void) | null = null
  private visible = false
  /** Set when the user dismisses the popup manually; means "don't re-show"
   *  until this batch of downloads has fully finished. */
  private dismissed = false

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.initialized = true
  }

  get isVisible(): boolean {
    return this.visible
  }

  private getURL() {
    return getSubWindowURL('/downloads')
  }

  private async ensureView() {
    if (this.readyPromise) {
      if (this.view && !this.view.webContents.isDestroyed()) {
        return this.readyPromise
      }
      this.readyPromise = null
      this.view = null
    }
    this.readyPromise = this.initView()
    return this.readyPromise
  }

  private async initView() {
    if (this.view) return
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        backgroundThrottling: false,
        session: session.fromPartition('minus-sub-window'),
        transparent: true,
      },
    })
    this.view.setBackgroundColor('#00000000')
    await this.view.webContents.loadURL(this.getURL()).catch(() => {
      // ignore
    })
  }

  async show() {
    if (!this.mainWindow || !this.initialized) return
    await this.ensureView()
    if (!this.view) return

    this.syncBounds()
    this.addViewOnTop()
    this.visible = true
    this.registerResizeHandler()
  }

  hide() {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    if (!this.visible) return
    this.visible = false
    this.unregisterResizeHandler()
    if (!this.mainWindow || !this.view) return
    try {
      this.mainWindow.contentView.removeChildView(this.view)
    } catch {
      // ignore
    }
  }

  /**
   * Drive popup visibility from the current download list. Shows while anything
   * is active, auto-hides shortly after the last download finishes.
   */
  notify(items: DownloadItem[]) {
    if (!this.mainWindow || !this.initialized) return
    const hasActive = items.some((d) => d.state === 'progressing' || d.state === 'interrupted')
    if (!hasActive) this.dismissed = false
    if (this.dismissed) return

    if (hasActive) {
      this.show()
    } else if (items.length > 0) {
      this.scheduleHide()
    } else {
      this.hide()
    }
  }

  /** User dismissed the popup; don't re-show until the download batch ends. */
  dismiss() {
    this.dismissed = true
    this.hide()
  }

  send(channel: string, data?: unknown) {
    if (!this.view || this.view.webContents.isDestroyed()) return
    this.view.webContents.send(channel, data)
  }

  private addViewOnTop() {
    if (!this.mainWindow || !this.view) return
    try {
      this.mainWindow.contentView.removeChildView(this.view)
    } catch {
      // ignore
    }
    try {
      this.mainWindow.contentView.addChildView(this.view)
    } catch {
      // ignore
    }
  }

  private scheduleHide() {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = setTimeout(() => this.hide(), AUTO_HIDE_DELAY)
  }

  private syncBounds() {
    if (!this.mainWindow || !this.view) return
    const { width } = this.mainWindow.getBounds()
    this.view.setBounds({
      x: Math.max(12, width - 380),
      y: 12,
      width: 380,
      height: this.mainWindow.getBounds().height,
    })
  }

  private registerResizeHandler() {
    if (this.resizeHandler || !this.mainWindow) return
    this.resizeHandler = () => {
      if (this.visible) this.syncBounds()
    }
    this.mainWindow.on('resize', this.resizeHandler)
  }

  private unregisterResizeHandler() {
    if (this.resizeHandler && this.mainWindow) {
      this.mainWindow.off('resize', this.resizeHandler)
    }
    this.resizeHandler = null
  }

  destroy() {
    this.hide()
    if (this.view) {
      try {
        this.view.webContents.close()
      } catch {
        // ignore
      }
      this.view = null
    }
    this.readyPromise = null
  }
}

export const downloadPopup = new DownloadPopupService()
