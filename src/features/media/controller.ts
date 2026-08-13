import { BrowserWindow } from 'electron'

import { subWindowService } from '~/features/sub-window/service'
import { IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { MediaTabEntry, MediaVideo } from '~/shared/types'

type TabInfo = { title: string; favicon?: string }

class MediaListController {
  private tabs = new Map<string, { title: string; favicon?: string; videos: MediaVideo[] }>()
  private infoResolver: (tabId: string) => TabInfo | undefined = () => undefined
  private mainWindow: BrowserWindow | null = null

  setMainWindow(window: BrowserWindow | null) {
    this.mainWindow = window
  }

  setTabInfoResolver(resolver: (tabId: string) => TabInfo | undefined) {
    this.infoResolver = resolver
  }

  updateTabVideos(tabId: string, videos: MediaVideo[]) {
    const info = this.infoResolver(tabId)
    this.tabs.set(tabId, { title: info?.title || '', favicon: info?.favicon, videos })
    this.broadcast()
  }

  removeTab(tabId: string) {
    this.tabs.delete(tabId)
    this.broadcast()
  }

  getAggregate(activeTabId?: string): MediaTabEntry[] {
    const entries: MediaTabEntry[] = []
    for (const [tabId, tab] of Array.from(this.tabs.entries())) {
      if (!tab.videos.length) continue
      entries.push({ tabId, title: tab.title, favicon: tab.favicon, videos: tab.videos })
    }
    if (activeTabId) {
      entries.sort((a, b) => (a.tabId === activeTabId ? -1 : b.tabId === activeTabId ? 1 : 0))
    }
    return entries
  }

  private broadcast() {
    const data = this.getAggregate()
    const win = this.mainWindow || BrowserWindow.getFocusedWindow()
    win?.webContents?.send(IPC_RENDERER_EVENT.MEDIA_LIST_UPDATED, data)
    subWindowService.send(IPC_RENDERER_EVENT.MEDIA_LIST_UPDATED, data)
  }
}

export const mediaListController = new MediaListController()
