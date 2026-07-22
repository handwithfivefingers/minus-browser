import log from 'electron-log'

import { cacheSystem } from '~/features/cacheSystem'
import { tabGroupController } from '~/features/tabGroup'
import { appDb } from '~/main/core/stores'
import { IUserInterface, ITab } from '~/shared/types'

import { Tab } from '../models/tab'

interface ITabDBRow {
  id: string
  title: string
  url: string
  is_pinned: number
  is_focused: number
  index: number
  favicon: string
  timestamp: number
  is_bookmarked: number
  is_hibernated: number
  prevent_hibernate: number
  group_id: string | null
  audible: number
  is_muted: number
  is_using_camera: number
  is_using_microphone: number
  is_using_screen_share: number
  blocked_notifications: string | null
  error: string | null
}

function deserializeTab(row: ITabDBRow): Record<string, any> {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    isPinned: !!row.is_pinned,
    isFocused: !!row.is_focused,
    index: row.index,
    favicon: row.favicon,
    timestamp: row.timestamp,
    isBookmarked: !!row.is_bookmarked,
    isHibernated: !!row.is_hibernated,
    preventHibernate: !!row.prevent_hibernate,
    groupId: row.group_id || undefined,
    audible: !!row.audible,
    isMuted: !!row.is_muted,
    isUsingCamera: !!row.is_using_camera,
    isUsingMicrophone: !!row.is_using_microphone,
    isUsingScreenShare: !!row.is_using_screen_share,
    blockedNotifications: row.blocked_notifications ? JSON.parse(row.blocked_notifications) : undefined,
    error: row.error ? JSON.parse(row.error) : null,
  }
}

export class TabController {
  activeTab: Tab | null = null
  tabsIndex: Record<string, number> = {}
  index = 0
  tabs: Map<string, Tab> = new Map()
  eventEmitter: <T>(payload: { channel: string; data: T }) => void
  private _userInterface: IUserInterface | null = null

  private hibernateTimer: ReturnType<typeof setInterval> | null = null
  private hibernateAfterMs: number = 60 * 60 * 1000
  private readonly HIBERNATE_CHECK_MS = 60_000

  setUserInterface(ui: IUserInterface) {
    this._userInterface = ui
    for (const [, tab] of this.tabs) {
      tab.setUserInterface(ui)
    }
  }

  constructor(eventEmitter: <T>(payload: { channel: string; data: T }) => void) {
    this.eventEmitter = eventEmitter
  }

  async initialize() {
    try {
      const fallback = async () => {
        const indexRow = appDb.get<{ value: string }>("SELECT value FROM app_state WHERE key = 'tab_index'")
        const activeTabRow = appDb.get<{ value: string }>("SELECT value FROM app_state WHERE key = 'active_tab_id'")
        const tabRows = appDb.query<ITabDBRow>('SELECT * FROM tabs ORDER BY "index" ASC')
        return {
          tabs: tabRows.map(deserializeTab),
          index: indexRow ? JSON.parse(indexRow.value) : 0,
          activeTabId: activeTabRow ? JSON.parse(activeTabRow.value) : null,
        }
      }
      const data = await cacheSystem.get<{
        tabs: Tab[]
        index: number
        activeTabId: string | null
      }>('tab', fallback)
      const tabs = data?.tabs || []
      const activeTabId = data?.activeTabId || null
      const newTabs = new Map()
      const tabsIndex: { [key: string]: number } = {}
      let idx = 0
      let activeTabRestored: Tab | null = null
      for (idx; idx < tabs?.length; idx++) {
        const tab = tabs[idx]
        if (!tab) continue
        const newTab = new Tab({
          ...tab,
          index: idx,
          eventEmitter: this.eventEmitter,
        })
        newTabs.set(newTab.id, newTab)
        if (newTab.id === activeTabId) {
          activeTabRestored = newTab
        }
      }

      if (activeTabRestored) {
        activeTabRestored.createView()
        this.activeTab = activeTabRestored
      } else if (newTabs.size > 0) {
        const firstTab = newTabs.values().next().value as Tab
        firstTab.createView()
        this.activeTab = firstTab
      }

      this.tabsIndex = tabsIndex
      this.tabs = newTabs
      this.index = idx
      this.startHibernateTimer()
      return this
    } catch (error) {
      log.error('TabController initialize error', error)
    }
  }

  private startHibernateTimer() {
    this.stopHibernateTimer()
    this.hibernateTimer = setInterval(() => {
      const now = Date.now()
      for (const [, tab] of this.tabs) {
        if (tab.id === this.activeTab?.id) continue
        if (tab.isPinned) continue
        if (tab.preventHibernate) continue
        if (tab.isHibernated) continue
        if (!tab.isAlive) continue
        if (now - tab.timestamp > this.hibernateAfterMs) {
          tab.hibernate()
        }
      }
    }, this.HIBERNATE_CHECK_MS)
  }

  setHibernateMode(mode: 'fast' | 'normal' | 'slow' | 'custom', customMinutes?: number) {
    switch (mode) {
      case 'fast':
        this.hibernateAfterMs = 15 * 60 * 1000
        break
      case 'normal':
        this.hibernateAfterMs = 60 * 60 * 1000
        break
      case 'slow':
        this.hibernateAfterMs = 4 * 60 * 60 * 1000
        break
      case 'custom':
        this.hibernateAfterMs = (customMinutes || 60) * 60 * 1000
        break
    }
  }

  private stopHibernateTimer() {
    if (this.hibernateTimer) {
      clearInterval(this.hibernateTimer)
      this.hibernateTimer = null
    }
  }

  hibernateTab(id: string) {
    const tab = this.tabs.get(id)
    if (!tab || tab.id === this.activeTab?.id || tab.isPinned) return
    tab.hibernate()
    this.syncCache()
  }

  hibernateTabs(ids: string[]) {
    for (const id of ids) {
      const tab = this.tabs.get(id)
      if (!tab || tab.isPinned || tab.isHibernated) continue
      tab.hibernate()
    }
    this.syncCache()
  }

  togglePreventHibernate(id: string) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.preventHibernate = !tab.preventHibernate
    this.syncCache()
    return tab.toJSON()
  }

  restoreTab(id: string) {
    const tab = this.tabs.get(id)
    if (!tab || !tab.isHibernated) return
    tab.wake()
    this.syncCache()
  }

  getTabs() {
    const tabs = this.tabs.size > 0 ? [...this.tabs.values()].map((tab) => tab.toJSON()) : []
    return tabs
  }
  getTabInstances(): Tab[] {
    return [...this.tabs.values()]
  }
  getTabById(id: string) {
    return this.tabs.get(id) || null
  }
  async addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: false,
      isBookmarked: false,
      ...tab,
      eventEmitter: this.eventEmitter,
    })
    try {
      tabObject.index = this.index
      const newIndex = this.index + 1
      tabObject.createView()
      this.tabs.set(tabObject.id, tabObject)
      this.index = newIndex
      this.activeTab = tabObject
      const tabJSON = tabObject.toJSON()
      return tabJSON
    } catch (err) {
    } finally {
      this.syncCache()
    }
  }
  async updateTab(id: string, tab: Partial<Tab>) {
    const currentTab = this.getTabById(id)
    if (!currentTab) return
    const updatedTab = new Tab({
      ...currentTab,
      ...tab,
      eventEmitter: this.eventEmitter,
    })
    try {
      this.tabs.set(id, updatedTab)
      if (this.activeTab?.id === id) {
        this.activeTab = updatedTab
      }
      return updatedTab
    } catch (error) {
      console.error('updateTab error', error)
    } finally {
      this.syncCache()
    }
  }

  closeTab(id: string) {
    const tab = this.getTabById(id)
    if (!tab) return { nextIndex: undefined, nextTab: undefined }
    if (tab.groupId) {
      tabGroupController.removeTabFromGroupByTabId(id)
    }
    if (tab.isAlive) {
      tab.hide()
      tab.destroyView()
    }
    this.tabs.delete(id)
    this.syncCache()
    const result = this.getPreviousTab(id)
    return result
  }

  togglePinTab(id: string) {
    const tab = this.tabs.get(id)
    if (!tab) return
    tab.isPinned = !tab.isPinned
    this.syncCache()
    return tab.toJSON()
  }

  reorderTabs(orderedIds: string[]) {
    const newTabs = new Map<string, Tab>()
    for (const id of orderedIds) {
      if (this.tabs.has(id)) {
        newTabs.set(id, this.tabs.get(id)!)
      }
    }
    for (const [id, tab] of this.tabs) {
      if (!newTabs.has(id)) {
        newTabs.set(id, tab)
      }
    }
    this.tabs = newTabs
    this.syncCache()
    return this.getTabs()
  }

  setActiveTab(id: string) {
    const currentTab = this.getTabById(id)
    if (!currentTab) return
    if (currentTab.isHibernated) {
      currentTab.wake()
    }
    currentTab.timestamp = Date.now()
    this.activeTab = currentTab
  }

  private syncCache() {
    const tabs = this.getTabs()
    const persisted = {
      tabs,
      index: this.index,
      activeTabId: this.activeTab?.id || null,
    }
    cacheSystem.set('tab', persisted as any)
    appDb.transaction(() => {
      appDb.run('DELETE FROM tabs')
      for (const tab of tabs || []) {
        appDb.run(
          'INSERT INTO tabs (id, title, url, is_pinned, is_focused, "index", favicon, timestamp, is_bookmarked, is_hibernated, prevent_hibernate, group_id, audible, is_muted, is_using_camera, is_using_microphone, is_using_screen_share, blocked_notifications, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            tab.id,
            tab.title,
            tab.url,
            tab.isPinned ? 1 : 0,
            tab.isFocused ? 1 : 0,
            tab.index ?? 0,
            tab.favicon || '',
            tab.timestamp || Date.now(),
            tab.isBookmarked ? 1 : 0,
            tab.isHibernated ? 1 : 0,
            tab.preventHibernate ? 1 : 0,
            tab.groupId || null,
            tab.audible ? 1 : 0,
            tab.isMuted ? 1 : 0,
            tab.isUsingCamera ? 1 : 0,
            tab.isUsingMicrophone ? 1 : 0,
            tab.isUsingScreenShare ? 1 : 0,
            tab.blockedNotifications ? JSON.stringify(tab.blockedNotifications) : null,
            tab.error ? JSON.stringify(tab.error) : null,
          ]
        )
      }
      appDb.run("DELETE FROM app_state WHERE key IN ('tab_index', 'active_tab_id')")
      appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('tab_index', ?)", [JSON.stringify(this.index)])
      appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_tab_id', ?)", [
        JSON.stringify(this.activeTab?.id || null),
      ])
    })
  }

  private getPreviousTab(id: string) {
    const entries = Array.from(this.tabs.entries())
    const result: {
      nextIndex: number | undefined
      nextTab: Tab | undefined
    } = {
      nextIndex: undefined,
      nextTab: undefined,
    }
    for (const [key, value] of entries) {
      if (key === id) break
      result.nextIndex = value.index
      result.nextTab = value
    }
    if (result.nextTab?.isHibernated) {
      result.nextTab.wake()
    }
    return result
  }

  destroy() {
    this.stopHibernateTimer()
    for (const [, tab] of this.tabs) {
      if (tab.isAlive) tab.destroyView()
    }
    this.tabs.clear()
    this.activeTab = null
  }
}
