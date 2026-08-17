import { app, BrowserWindow, dialog, shell } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

import { v7 as uuid_v7 } from 'uuid'

import { browserSession } from '~/main/core/services/session'
import { appDb } from '~/main/core/stores'
import { IPC_DOWNLOAD_RENDERER_EVENT } from '~/shared/constants/ipc/download'
import { DownloadItem, DownloadState } from '~/shared/types/download'

import { downloadPopup } from './popup'

interface ActiveEntry {
  item: Electron.DownloadItem
  data: DownloadItem
}

interface DownloadRow {
  id: string
  filename: string
  url: string
  save_path: string
  mime_type: string
  total_bytes: number
  received_bytes: number
  state: string
  started_at: number
  ended_at: number
}

const MAX_HISTORY = 500

export class DownloadController {
  private mainWindow: BrowserWindow | null = null
  private active = new Map<string, ActiveEntry>()
  private initialized = false
  /** Prevents the same Electron DownloadItem from being tracked twice (e.g. by
   *  the deferred save-dialog re-download and the persistent session listener). */
  private trackedItems = new WeakSet<Electron.DownloadItem>()
  /** Save paths chosen via the "ask where to save" dialog, consumed by the next
   *  matching will-download fired by webContents.downloadURL(). */
  private deferredSavePaths: Array<{ webContents: Electron.WebContents; url: string; savePath: string }> = []

  /** Settings provided by the ViewController after loadUserInterface() */
  private downloadDirectory = ''
  private askDownloadLocation = false

  init() {
    if (this.initialized) return
    this.initialized = true
    browserSession.on('will-download', (event, item, webContents) => this.onWillDownload(event, item, webContents))
  }

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }

  setPreferences(preferences: { downloadDirectory?: string; askDownloadLocation?: boolean }) {
    if (typeof preferences?.downloadDirectory === 'string' && preferences.downloadDirectory) {
      this.downloadDirectory = preferences.downloadDirectory
    }
    if (typeof preferences?.askDownloadLocation === 'boolean') {
      this.askDownloadLocation = preferences.askDownloadLocation
    }
  }

  getDefaultDir(): string {
    if (this.downloadDirectory && fs.existsSync(this.downloadDirectory)) return this.downloadDirectory
    try {
      return app.getPath('downloads')
    } catch {
      return app.getPath('home')
    }
  }

  // ------------------------------------------------------------------
  // Download creation
  // ------------------------------------------------------------------

  private onWillDownload(event: Electron.Event, item: Electron.DownloadItem, webContents: Electron.WebContents) {
    // A download re-fired by webContents.downloadURL() after the "ask where to
    // save" dialog — apply the chosen path and track it.
    const deferredSavePath = this.consumeDeferredSavePath(webContents, item.getURL())
    if (deferredSavePath) {
      item.setSavePath(deferredSavePath)
      this.track(item)
      return
    }

    // "Ask where to save each file" — defer the download while the dialog is open.
    const defaultPath = path.join(this.getDefaultDir(), item.getFilename())
    const pathAlreadyChosen = item.getSavePath() && item.getSavePath() !== defaultPath
    if (this.askDownloadLocation && !pathAlreadyChosen) {
      event.preventDefault()
      const win = this.mainWindow || BrowserWindow.getFocusedWindow()
      dialog
        .showSaveDialog(win as BrowserWindow, {
          title: 'Save As',
          defaultPath,
          buttonLabel: 'Save',
        })
        .then((result) => {
          if (result.canceled || !result.filePath) return // cancelled → nothing is saved
          // Remember the choice; the re-fired will-download consumes it instead
          // of opening the dialog again or double-tracking the same item.
          this.setDeferredSavePath(webContents, item.getURL(), result.filePath)
          webContents.downloadURL(item.getURL())
        })
        .catch(() => {
          // dialog failed — fall back to default behaviour
        })
      return
    }
    this.track(item)
  }

  private consumeDeferredSavePath(webContents: Electron.WebContents, url: string): string | undefined {
    const index = this.deferredSavePaths.findIndex((entry) => entry.webContents === webContents && entry.url === url)
    if (index === -1) return undefined
    const [entry] = this.deferredSavePaths.splice(index, 1)
    return entry.savePath
  }

  /** Register a save path to apply to the next will-download fired by the given
   *  webContents for the given URL. Used by the "ask where to save" dialog and
   *  "Save Image As..." so the download is tracked exactly once with the chosen
   *  path (instead of relying on a session.once listener racing the global
   *  will-download handler). */
  setDeferredSavePath(webContents: Electron.WebContents, url: string, savePath: string) {
    this.deferredSavePaths.push({ webContents, url, savePath })
  }

  private track(item: Electron.DownloadItem) {
    if (this.trackedItems.has(item)) return
    this.trackedItems.add(item)
    const id = uuid_v7()
    const saved = item.getSavePath() || path.join(this.getDefaultDir(), item.getFilename())
    const data: DownloadItem = {
      id,
      filename: item.getFilename(),
      url: item.getURL(),
      savePath: saved,
      mimeType: item.getMimeType(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      progress: this.computeProgress(item.getReceivedBytes(), item.getTotalBytes()),
      state: 'progressing',
      canResume: item.canResume(),
      startedAt: Date.now(),
    }
    this.active.set(id, { item, data })

    item.on('updated', (_event, state) => {
      const entry = this.active.get(id)
      if (!entry) return
      if (state === 'interrupted') {
        entry.data.state = 'interrupted'
        entry.data.canResume = item.canResume()
      }
      entry.data.paused = item.isPaused()
      entry.data.receivedBytes = item.getReceivedBytes()
      entry.data.totalBytes = item.getTotalBytes()
      entry.data.progress = this.computeProgress(item.getReceivedBytes(), item.getTotalBytes())
      entry.data.savePath = item.getSavePath() || entry.data.savePath
      this.emitItem(entry.data)
    })

    item.on('done', (_event, state) => {
      const entry = this.active.get(id)
      if (!entry) return
      const downloadState = this.mapDoneState(item, state)
      entry.data.state = downloadState
      entry.data.endedAt = Date.now()
      entry.data.progress = downloadState === 'completed' ? 100 : entry.data.progress
      entry.data.receivedBytes = item.getReceivedBytes()
      entry.data.totalBytes = item.getTotalBytes()
      entry.data.canResume = item.canResume()
      entry.data.savePath = item.getSavePath() || entry.data.savePath
      this.active.delete(id)
      this.persist(entry.data)
      this.emitItem(entry.data)
      this.emitList()
    })

    this.emitItem(data)
    this.emitList()
  }

  private mapDoneState(item: Electron.DownloadItem, state: string): DownloadState {
    if (state === 'completed') return 'completed'
    if (state === 'cancelled') return 'cancelled'
    // interrupted
    return 'interrupted'
  }

  private computeProgress(received: number, total: number): number {
    if (received <= 0) return 0
    if (total <= 0) return received > 0 ? 1 : 0
    return Math.min(100, Math.round((received / total) * 100))
  }

  // ------------------------------------------------------------------
  // Broadcast
  // ------------------------------------------------------------------

  private emitItem(item: DownloadItem) {
    this.mainWindow?.webContents?.send(IPC_DOWNLOAD_RENDERER_EVENT.ITEM_UPDATED, item)
    downloadPopup.send(IPC_DOWNLOAD_RENDERER_EVENT.ITEM_UPDATED, item)
  }

  private emitList() {
    const list = this.getAll()
    this.mainWindow?.webContents?.send(IPC_DOWNLOAD_RENDERER_EVENT.LIST_CHANGED, list)
    downloadPopup.send(IPC_DOWNLOAD_RENDERER_EVENT.LIST_CHANGED, list)
    downloadPopup.notify(list)
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  getAll(): DownloadItem[] {
    const activeItems = Array.from(this.active.values()).map((e) => ({ ...e.data }) as DownloadItem)
    const rows = appDb.query<DownloadRow>('SELECT * FROM downloads ORDER BY started_at DESC LIMIT ?', [MAX_HISTORY])
    const historyItems: DownloadItem[] = rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      url: r.url,
      savePath: r.save_path,
      mimeType: r.mime_type || undefined,
      totalBytes: r.total_bytes,
      receivedBytes: r.received_bytes,
      progress: this.computeProgress(r.received_bytes, r.total_bytes),
      state: this.isValidState(r.state) ? (r.state as DownloadState) : 'completed',
      canResume: false,
      startedAt: r.started_at,
      endedAt: r.ended_at || undefined,
    }))
    const merged = new Map<string, DownloadItem>()
    for (const item of historyItems) merged.set(item.id, item)
    for (const item of activeItems) merged.set(item.id, item)
    return Array.from(merged.values()).sort((a, b) => b.startedAt - a.startedAt)
  }

  private isValidState(state: string): state is DownloadState {
    return state === 'completed' || state === 'cancelled' || state === 'interrupted' || state === 'progressing'
  }

  private getEntry(id: string): ActiveEntry | undefined {
    return this.active.get(id)
  }

  pause(id: string): { success: boolean } {
    const entry = this.getEntry(id)
    if (!entry) return { success: false }
    try {
      if (!entry.item.isPaused()) entry.item.pause()
      entry.data.canResume = true
      entry.data.paused = true
      this.emitItem(entry.data)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  resume(id: string): { success: boolean } {
    const entry = this.getEntry(id)
    if (!entry) return { success: false }
    try {
      if (entry.item.canResume()) {
        entry.item.resume()
        entry.data.state = 'progressing'
        entry.data.paused = false
        this.emitItem(entry.data)
        return { success: true }
      }
      return { success: false }
    } catch {
      return { success: false }
    }
  }

  cancel(id: string): { success: boolean } {
    const entry = this.getEntry(id)
    if (!entry) return { success: false }
    try {
      entry.item.cancel()
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  open(id: string): { success: boolean } {
    const entry = this.getEntry(id)
    const savePath = entry?.data.savePath || this.getHistorySavePath(id)
    if (!savePath) return { success: false }
    try {
      if (!fs.existsSync(savePath)) return { success: false }
      shell.openPath(savePath)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  showInFolder(id: string): { success: boolean } {
    const entry = this.getEntry(id)
    const savePath = entry?.data.savePath || this.getHistorySavePath(id)
    if (!savePath) return { success: false }
    try {
      if (!fs.existsSync(savePath)) return { success: false }
      shell.showItemInFolder(savePath)
      return { success: true }
    } catch {
      return { success: false }
    }
  }

  remove(id: string): { success: boolean } {
    const entry = this.active.get(id)
    if (entry) {
      try {
        entry.item.cancel()
      } catch {
        // ignore
      }
      this.active.delete(id)
    }
    appDb.run('DELETE FROM downloads WHERE id = ?', [id])
    this.emitList()
    return { success: true }
  }

  clear(): { success: boolean } {
    for (const [id, entry] of Array.from(this.active.entries())) {
      try {
        entry.item.cancel()
      } catch {
        // ignore
      }
      this.active.delete(id)
    }
    appDb.run('DELETE FROM downloads')
    this.emitList()
    return { success: true }
  }

  private getHistorySavePath(id: string): string | undefined {
    const row = appDb.get<DownloadRow>('SELECT save_path FROM downloads WHERE id = ?', [id])
    return row?.save_path
  }

  // ------------------------------------------------------------------
  // Persistence
  // ------------------------------------------------------------------

  private persist(item: DownloadItem) {
    try {
      appDb.run(
        `INSERT OR REPLACE INTO downloads
          (id, filename, url, save_path, mime_type, total_bytes, received_bytes, state, started_at, ended_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.filename,
          item.url,
          item.savePath,
          item.mimeType || '',
          item.totalBytes,
          item.receivedBytes,
          item.state,
          item.startedAt,
          item.endedAt || Date.now(),
        ]
      )
      // Cap history size
      const rows = appDb.query<{ id: string }>('SELECT id FROM downloads ORDER BY started_at DESC LIMIT -1 OFFSET ?', [
        MAX_HISTORY,
      ])
      for (const row of rows) {
        appDb.run('DELETE FROM downloads WHERE id = ?', [row.id])
      }
    } catch (error) {
      console.error('[download] persist failed', error)
    }
  }
}

export const downloadController = new DownloadController()
