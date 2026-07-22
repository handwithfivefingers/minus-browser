import { BrowserWindow, ipcMain, WebContentsView, app } from 'electron'
import * as fs from 'node:fs'
import path from 'node:path'

import { useWebNotificationStore } from '~/shared/store/useNotificationStore'
import { WebNotification } from '~/shared/types/notification'

import { NOTIFICATION_LIST_HTML } from './index'
export class NotificationViewService {
  private view: WebContentsView | null = null
  private mainWindow: BrowserWindow | null = null
  private htmlPath: string | null = null
  private isListOpen = false
  private readyPromise: Promise<void> | null = null
  private clickHandler: ((tabId: string) => void) | null = null
  private getHistoryHandler: (() => WebNotification[]) | null = null
  private onStateChangeHandler: (() => void) | null = null
  private toastQueue: WebNotification[] = []
  private toastShowing = false
  private toastTimer: ReturnType<typeof setTimeout> | null = null

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    this.htmlPath = path.join(app.getPath('userData'), 'notification-list.html')

    try {
      fs.writeFileSync(this.htmlPath, NOTIFICATION_LIST_HTML, 'utf-8')
    } catch (e) {
      console.error('[NotificationList] Failed to write HTML:', e)
    }

    this.registerIpc()
  }

  private registerIpc() {
    ipcMain.on('NOTIFICATION_VIEW_CLICK', (_event, { tabId }: { tabId: string }) => {
      this.clickHandler?.(tabId)
      this.closeList()
    })

    ipcMain.on('NOTIFICATION_VIEW_CLOSE', () => {
      this.closeList()
    })

    ipcMain.on('NOTIFICATION_VIEW_GET_HISTORY', () => {
      this.sendHistory()
    })

    ipcMain.on('NOTIFICATION_VIEW_MARK_READ', (_event, { id }: { id: string }) => {
      useWebNotificationStore.getState().markAsRead(id)
      this.sendHistory()
      this.onStateChangeHandler?.()
    })

    ipcMain.on('NOTIFICATION_VIEW_MARK_ALL_READ', () => {
      useWebNotificationStore.getState().markAllAsRead()
      this.sendHistory()
      this.onStateChangeHandler?.()
    })

    ipcMain.on('NOTIFICATION_VIEW_CLEAR_ALL', () => {
      useWebNotificationStore.getState().clear()
      this.sendHistory()
      this.onStateChangeHandler?.()
      this.closeList()
    })
  }

  setCallbacks(handlers: {
    onNavigateToTab: (tabId: string) => void
    getHistory: () => WebNotification[]
    onStateChange?: () => void
  }) {
    this.clickHandler = handlers.onNavigateToTab
    this.getHistoryHandler = handlers.getHistory
    this.onStateChangeHandler = handlers.onStateChange ?? null
  }

  private async ensureView() {
    if (this.readyPromise) {
      if (this.view && !this.view.webContents.isDestroyed()) {
        return this.readyPromise
      }
      this.readyPromise = null
      this.view = null
    }
    if (!this.htmlPath) return
    this.readyPromise = this.initView()
    return this.readyPromise
  }

  private async initView() {
    if (this.view) return
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'notification-view-preload.js'),
        backgroundThrottling: false,
      },
    })
    this.view.setBackgroundColor('#00000000')
    await this.view.webContents.loadFile(this.htmlPath!).catch((err) => {
      console.error('[NotificationList] Failed to load HTML:', err)
    })
  }

  get isViewAttached(): boolean {
    return this.isListOpen || this.toastShowing
  }

  ensureOnTop() {
    if (!this.mainWindow || !this.view || !this.isViewAttached) return
    try {
      this.mainWindow.contentView.removeChildView(this.view)
    } catch {
      // ignore
    }
    this.mainWindow.contentView.addChildView(this.view)
  }

  /** Show a toast notification (auto-dismiss, queued) */
  async showToast(notification: WebNotification) {
    if (!this.mainWindow) return
    await this.ensureView()
    if (!this.view) return

    this.toastQueue.push(notification)
    if (!this.toastShowing) {
      await this.processToastQueue()
    }
  }

  private async processToastQueue() {
    if (this.toastShowing || this.toastQueue.length === 0 || !this.view || !this.mainWindow) return
    this.toastShowing = true

    const notification = this.toastQueue.shift()!

    this.syncToastBounds()

    this.addViewToWindow()

    this.view.webContents.send('NOTIFICATION_VIEW_TOAST', notification)

    this.toastTimer = setTimeout(() => {
      this.hideToast()
    }, 4000)
  }

  private hideToast() {
    if (!this.view || this.view.webContents.isDestroyed()) return
    this.view.webContents.send('NOTIFICATION_VIEW_HIDE_TOAST')
    this.toastShowing = false
    if (this.toastTimer) {
      clearTimeout(this.toastTimer)
      this.toastTimer = null
    }

    setTimeout(() => {
      if (!this.isListOpen) {
        this.removeViewFromWindow()
      }
      this.processToastQueue()
    }, 200)
  }

  dismissToast() {
    this.hideToast()
    this.toastQueue = []
  }

  private syncToastBounds() {
    if (!this.mainWindow || !this.view) return
    const { width } = this.mainWindow.getBounds()
    this.view.setBounds({
      x: Math.max(12, width - 380),
      y: 12,
      width: 380,
      height: 150,
    })
  }

  private syncListBounds() {
    if (!this.mainWindow || !this.view) return
    const { width } = this.mainWindow.getBounds()
    this.view.setBounds({
      x: Math.max(12, width - 400),
      y: 12,
      width: 390,
      height: 500,
    })
  }

  private addViewToWindow() {
    if (!this.mainWindow || !this.view) return
    try {
      this.mainWindow.contentView.addChildView(this.view)
      // Ensure notification view is always on top (zIndex=3)
      this.mainWindow.contentView.removeChildView(this.view)
      this.mainWindow.contentView.addChildView(this.view)
    } catch {
      // ignore
    }
  }

  private removeViewFromWindow() {
    if (!this.mainWindow || !this.view) return
    try {
      this.mainWindow.contentView.removeChildView(this.view)
    } catch {
      // ignore
    }
  }

  async openList() {
    if (!this.mainWindow) return
    await this.ensureView()
    if (!this.view) return

    this.syncListBounds()
    this.addViewToWindow()
    this.isListOpen = true
    this.sendHistory()
    this.view.webContents.send('NOTIFICATION_VIEW_SHOW_LIST')
  }

  closeList() {
    if (!this.isListOpen || !this.mainWindow || !this.view) return
    this.view.webContents.send('NOTIFICATION_VIEW_HIDE_LIST')
    this.isListOpen = false

    if (!this.toastShowing) {
      this.removeViewFromWindow()
    }
  }

  toggle() {
    if (this.isListOpen) {
      this.closeList()
    } else {
      this.openList()
    }
  }

  private sendHistory() {
    if (!this.view || this.view.webContents.isDestroyed()) return
    const notifications = this.getHistoryHandler?.() || []
    this.view.webContents.send('NOTIFICATION_VIEW_HISTORY', notifications)
  }

  destroy() {
    this.dismissToast()
    this.closeList()
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
