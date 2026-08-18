import { BrowserWindow, session, WebContentsView } from 'electron'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { SUB_WINDOW_EMIT } from '~/shared/constants/ipc/sub-window'

const preloadPath = path.join(__dirname, '/preload.js')

/** URL of the sub-window renderer app; pass a hash route (e.g. `/downloads`)
 *  to load a specific overlay directly (used by non-modal popups). */
export function getSubWindowURL(route?: string): string {
  try {
    /**@ts-ignore */
    if (SUB_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      return route ? `${SUB_WINDOW_VITE_DEV_SERVER_URL}#${route}` : SUB_WINDOW_VITE_DEV_SERVER_URL
    }
  } catch {
    // ignore
  }
  const filePath = path.join(__dirname, '../renderer/sub_window/index.html')
  return route ? `${pathToFileURL(filePath).toString()}#${route}` : pathToFileURL(filePath).toString()
}

interface PendingRequest {
  resolve: (data: any) => void
  reject: (err: Error) => void
  timer: NodeJS.Timeout
}

export class SubWindowService {
  isOpen = false
  onDidOpen: (() => void) | null = null
  onDidClose: (() => void) | null = null
  private view: WebContentsView | null = null
  private mainWindow: BrowserWindow | null = null
  private resizeHandler: (() => void) | null = null
  private blurHandler: (() => void) | null = null
  private readyPromise: Promise<void> | null = null
  private pendingRequests = new Map<string, PendingRequest>()
  private lastOpenTime = 0
  /** Overlay route currently shown in the reused view (null while closed). */
  private currentRoute: string | null = null

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  resolveRequest(data: { requestId?: string; payload?: any }) {
    const requestId = data?.requestId
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!
      clearTimeout(pending.timer)
      this.pendingRequests.delete(requestId)
      pending.resolve(data.payload ?? data)
      this.close()
    }
    return { success: true }
  }

  private getURL() {
    return getSubWindowURL()
  }

  private syncViewBounds() {
    if (!this.mainWindow || !this.view) return
    const { width, height } = this.mainWindow.getBounds()
    this.view.setBounds({ x: 0, y: 0, width, height })
  }

  async warmup(): Promise<void> {
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
    // this.view.webContents.openDevTools()
    this.view.setBackgroundColor('#00000000')
    const webContents = this.view.webContents
    // If the sub-window renderer fails to load (dev server restart, bad build
    // output, ...) forget the view so the next open() rebuilds it. Otherwise
    // NAVIGATE messages are sent into a page that never booted and the overlay
    // silently never shows.
    webContents.on('did-fail-load', (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
      // Ignore ERR_ABORTED (-3): fires on any canceled navigation, which is
      // benign. Real failures invalidate the view so the next open() rebuilds.
      if (isMainFrame && errorCode !== -3) this.invalidateView()
    })
    await webContents.loadURL(this.getURL()).catch(() => {
      // ignore
    })
    // this.view.webContents.reloadIgnoringCache();
  }

  /** Drop the current (broken/loaded-into-the-void) view so the next open()
   *  creates a fresh one. Safe to call even while an open() is in flight. */
  private invalidateView() {
    const view = this.view
    this.view = null
    this.readyPromise = null
    this.currentRoute = null
    if (this.isOpen && this.mainWindow && view) {
      try {
        this.mainWindow.contentView.removeChildView(view)
      } catch {
        // ignore
      }
      this.isOpen = false
      this.onDidClose?.()
    }
    try {
      view?.webContents.close()
    } catch {
      // ignore
    }
  }

  ensureOnTop() {
    if (!this.isOpen || !this.mainWindow || !this.view) return
    // Raise the already-attached view to the topmost position. No
    // removeChildView() needed — Electron reorders an attached view.
    try {
      this.mainWindow.contentView.addChildView(this.view)
    } catch {
      // ignore
    }
  }

  async open(route: string, payload?: any): Promise<any> {
    if (!this.mainWindow) return
    await this.warmup()
    if (!this.view) return
    if (this.view.webContents.isDestroyed()) return

    if (payload) {
      this.view.webContents.send(SUB_WINDOW_EMIT.PAYLOAD, payload)
    }

    // Don't re-add the view / re-register resize handlers when the overlay for
    // this route is already up (e.g. duplicate Cmd+K or double-click on the
    // address bar). The renderer still gets NAVIGATE so it can remount and pick
    // up the fresh payload.
    const alreadyOpen = this.isOpen && this.currentRoute === route

    this.syncViewBounds()
    this.view.webContents.send(SUB_WINDOW_EMIT.NAVIGATE, { route })
    this.currentRoute = route

    if (alreadyOpen) {
      this.ensureOnTop()
      return true
    }

    // Re-raise the view (reorders if already attached, e.g. after a previous
    // close() that kept it attached) and make it visible. The view is NEVER
    // detached from the window: Electron 43's compositor stops painting a
    // WebContentsView after enough removeChildView/addChildView cycles
    // interleaved with other views (tabs, toasts, popups), even though
    // webContents stays alive (devtools keeps showing the page). Keeping it
    // attached and toggling setVisible() avoids that code path entirely.
    this.mainWindow.contentView.addChildView(this.view)
    this.view.setVisible(true)
    this.view.webContents.focus()
    this.isOpen = true
    this.lastOpenTime = Date.now()
    this.onDidOpen?.()

    if (this.resizeHandler) {
      this.mainWindow.off('resize', this.resizeHandler)
    }
    this.resizeHandler = () => this.syncViewBounds()
    this.mainWindow.on('resize', this.resizeHandler)
    // Turn Off Close on Blur
    // this.blurHandler = () => this.close()
    // this.mainWindow.on('blur', this.blurHandler)
    return true
  }

  async openWithResult(route: string, payload?: any, timeoutMs = 30000): Promise<any> {
    const requestId = `sub-${route}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    await this.open(route, { requestId, ...payload })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId)
        this.close()
        reject(new Error(`Sub-window ${route} timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pendingRequests.set(requestId, { resolve, reject, timer })
    })
  }

  close() {
    if (!this.isOpen || !this.mainWindow || !this.view) return
    // Ignore close if opened less than 300ms ago (prevents focus()
    // from triggering a BrowserWindow blur that closes immediately)
    // if (Date.now() - this.lastOpenTime < 300) return
    this.isOpen = false
    this.currentRoute = null
    this.onDidClose?.()

    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer)
      pending.reject(new Error('Sub-window closed'))
    }
    this.pendingRequests.clear()

    if (this.resizeHandler) {
      this.mainWindow.off('resize', this.resizeHandler)
      this.resizeHandler = null
    }
    if (this.blurHandler) {
      this.mainWindow.off('blur', this.blurHandler)
      this.blurHandler = null
    }

    if (!this.view.webContents.isDestroyed()) {
      this.view.webContents.send(SUB_WINDOW_EMIT.NAVIGATE, { route: '/' })
    }

    try {
      // Hide instead of removing. The view stays attached (see open()) so the
      // compositor never sees a detach/reattach cycle; sink it to the bottom so
      // visible sibling views (tabs, toasts) are hit-tested first.
      this.view.setVisible(false)
      this.mainWindow.contentView.addChildView(this.view, 0)
    } catch {
      // ignore
    }
  }

  send(channel: string, data?: any) {
    if (!this.view || this.view.webContents.isDestroyed()) return
    this.view.webContents.send(channel, data)
  }

  getWebContents(): Electron.WebContents | null {
    return this.view && !this.view.webContents.isDestroyed() ? this.view.webContents : null
  }

  destroy() {
    this.close()
    if (this.view) {
      // close() keeps the view attached (invisible), so remove it on real teardown.
      try {
        this.mainWindow?.contentView.removeChildView(this.view)
      } catch {
        // ignore
      }
      this.view.webContents.close()
      this.view = null
    }
    this.readyPromise = null
  }
}

export const subWindowService = new SubWindowService()
