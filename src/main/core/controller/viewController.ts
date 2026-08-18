import { app, BrowserWindow, ipcMain, nativeTheme, Notification, WebContentsView, webContents } from 'electron'

import log from 'electron-log'

import { adblocker } from '~/features/adblocker/plugin'
import { checkForUpdates, initAutoUpdate, quitAndInstall } from '~/features/autoUpdate/autoUpdate.init'
import { cacheSystem } from '~/features/cacheSystem'
import { downloadController, downloadInvokeHandlers } from '~/features/download'
import { downloadPopup } from '~/features/download/popup'
import { mediaListController } from '~/features/media/controller'
import { NotificationService } from '~/features/notification/service'
import { SearchRoute, searchController as splitSearchController } from '~/features/search'
import {
  spotlightInvokeHandlers,
  tabGroupEmitHandlers,
  tabGroupInvokeHandlers,
  translateInvokeHandlers,
  userScriptInvokeHandlers,
  vaultInvokeHandlers,
} from '~/features/sub-window/ipc'
import { captureInvokeHandlers } from '~/features/sub-window/ipc/capture-hanlers'
import { subWindowService } from '~/features/sub-window/service'
import { tabGroupController } from '~/features/tabGroup'
import { TabController } from '~/features/tabs/controllers'
import { WindowOpenRequest } from '~/features/tabs/models/permission'
import { Tab } from '~/features/tabs/models/tab'
import { translateController } from '~/features/translate/controllers'
import { registerGMAPIHandlers } from '~/features/userscript/gm-api'
import { registerErrorHandler } from '~/features/userscript/services/error-service'
import { startUpdateChecker } from '~/features/userscript/services/update-service'
import { registerVaultPageIpc } from '~/features/vault/controllers/pageIpc'
import { aiSettingsController } from '~/main/core/controller/aiSettingsController'
import { aiSettingsInvokeHandlers } from '~/main/core/controller/aiSettingsHandlers'
import { historyController, HistoryRoute } from '~/main/core/controller/history'
import { TodoRoute } from '~/main/core/controller/todo'
import { IHandleResizeView, IPC, ITab } from '~/main/core/interfaces'
import { ErrorServices } from '~/main/core/services/error.services'
import { browserSession } from '~/main/core/services/session'
import { appDb, eventStore } from '~/main/core/stores'
import { permissionStore } from '~/main/core/stores/permission.store'
import { isSameURl } from '~/main/core/utils'
import { IPC_DOWNLOAD_EMIT, IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { SUB_WINDOW_INVOKE, SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_RENDERER_EVENT } from '~/shared/constants/ipc/tabGroup'
import { IUserInterface, PermissionDecision, PermissionType } from '~/shared/types'
import { isSafeUrl } from '~/shared/utils'

export type EmitToRenderer = (channel: string, data?: unknown) => void
export class ViewController {
  window: BrowserWindow
  wc: Electron.WebContents | undefined
  minusSession: Electron.Session | undefined = browserSession
  userInterface: IUserInterface | undefined = undefined
  tabController: TabController | undefined
  searchController = splitSearchController
  lastCaptureImage: Electron.NativeImage | null = null
  private invokeHandlers: Record<string, (data?: any) => any> | undefined
  private listenerHandlers: Record<string, (data?: any) => void> | undefined
  private initPromise: Promise<void>
  private notificationService = new NotificationService()

  constructor(window: BrowserWindow) {
    this.tabController = new TabController((payload) => this.onInvoke(payload))
    mediaListController.setTabInfoResolver((id) => {
      const t = this.tabController?.getTabById(id)
      return t ? { title: t.title, favicon: t.favicon } : undefined
    })
    mediaListController.setMainWindow(window)
    this.window = window
    this.initPromise = this.init()
  }

  async ready(): Promise<void> {
    return this.initPromise
  }

  private async initializeHandlers() {
    try {
      this.invokeHandlers = {
        [IPC_INVOKE_CHANNEL.GET_TABS]: () => this.getTabs(),
        [IPC_INVOKE_CHANNEL.CREATE_TAB]: (tab?: Partial<ITab>) => this.createTab(tab),
        [IPC_INVOKE_CHANNEL.GET_TAB]: (tab?: Partial<ITab>) => this.getTab({ id: tab?.id as string }),
        [IPC_INVOKE_CHANNEL.GET_USER_INTERFACE]: () => this.loadUserInterface(),
        [IPC_INVOKE_CHANNEL.CLOUD_SAVE]: () => this.persist(),
        [IPC_INVOKE_CHANNEL.INTERFACE_SAVE]: (data) => this.interfaceSave(data),
        ...vaultInvokeHandlers,
        [IPC_INVOKE_CHANNEL.VAULT_SHOW_CAPTURE]: (data) => {
          subWindowService.open('/vault-capture', data)
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.VAULT_NEVER_SAVE]: (data: { hostname?: string }) => {
          const hostname = (data?.hostname || '').toLowerCase()
          if (!hostname) return { success: false }
          const current = this.userInterface?.passwordsNeverSaveDomains || []
          if (current.includes(hostname)) return { success: true }
          const next = { ...(this.userInterface as IUserInterface), passwordsNeverSaveDomains: [...current, hostname] }
          return this.interfaceSave(next).then(() => ({ success: true }))
        },
        ...aiSettingsInvokeHandlers,
        ...translateInvokeHandlers,
        ...userScriptInvokeHandlers,
        ...SearchRoute,
        ...HistoryRoute,
        ...TodoRoute,
        ...spotlightInvokeHandlers,
        ...tabGroupInvokeHandlers,
        ...this.bindingHandlersController(captureInvokeHandlers),
        [IPC_INVOKE_CHANNEL.OPEN_SITE_INFO]: (data) => {
          subWindowService.open('/site-info', data)
          return { success: true }
        },
        ...adblocker.getInvokeHandlers(),
        ...downloadInvokeHandlers,
        [IPC_TAB_GROUP_INVOKE.HIDE_GROUP]: async (id: string) => {
          const group = tabGroupController.getGroups().find((g) => g.id === id)
          if (!group) return { success: true }

          const tabIds = group.tabIds

          // If active tab is in this group, switch to another visible tab first
          const activeTab = this.tabController?.activeTab
          if (activeTab && tabIds.includes(activeTab.id)) {
            const allTabs = this.tabController?.getTabInstances() || []
            const hiddenGroupTabIds = this.getHiddenGroupTabIds()
            const targetTab = allTabs.find(
              (t) => t.id && !tabIds.includes(t.id) && (t.isPinned || !hiddenGroupTabIds.has(t.id))
            )
            if (targetTab) {
              if (targetTab.isHibernated) targetTab.wake()
              this.tabController?.setActiveTab(targetTab.id)
              this.forwardRendererEvent('OPEN_TAB_BY_ID', { id: targetTab.id })
            } else {
              await this.createTab({})
            }
          }

          // Hibernate all non-pinned tabs in the group
          this.tabController?.hibernateTabs(tabIds)

          // Hide the group (triggers onChanged → syncTabsToWindows)
          await tabGroupController.hideGroup(id)

          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.GET_SITE_PERMISSIONS]: (data: { origin: string; all?: boolean }) => {
          if (data?.all) {
            return permissionStore.getAllSites()
          }
          return permissionStore.getSitePermissions(data?.origin || '')
        },
        [IPC_INVOKE_CHANNEL.SET_SITE_PERMISSION]: (data: {
          origin: string
          permission: PermissionType
          decision: PermissionDecision
        }) => {
          permissionStore.setSitePermission(data.origin, data.permission, data.decision)
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.RESET_SITE_PERMISSION]: (data: { origin: string; permission: PermissionType }) => {
          permissionStore.resetSitePermission(data.origin, data.permission)
          return { success: true }
        },
        [SUB_WINDOW_INVOKE.RESOLVE]: (data) => subWindowService.resolveRequest(data),
        [IPC_INVOKE_CHANNEL.RESET_ALL_PERMISSIONS]: () => {
          permissionStore.resetAllPermissions()
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.AI_GET_PAGE_TEXT]: () => this.getActiveTabPageText(),
        [IPC_INVOKE_CHANNEL.AI_GET_SELECTED_TEXT]: () => this.getActiveTabSelectedText(),
        [IPC_INVOKE_CHANNEL.TOGGLE_PIN_TAB]: (data) => this.togglePinTab(data),
        [IPC_INVOKE_CHANNEL.TOGGLE_PREVENT_HIBERNATE]: (data) => this.togglePreventHibernate(data),
        [IPC_INVOKE_CHANNEL.CHECK_FOR_UPDATE]: () => {
          checkForUpdates()
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.QUIT_AND_INSTALL_UPDATE]: () => {
          quitAndInstall()
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.CLEAR_BROWSING_DATA]: async () => {
          await browserSession.clearStorageData()
          historyController.clearAll()
          permissionStore.resetAllPermissions()
          adblocker.clearCache()
          ;(
            [
              'tab',
              'password',
              'userscripts',
              'passwordVault',
              'translate',
              'interface',
              'session',
              'tabGroups',
            ] as const
          ).forEach((k) => {
            cacheSystem.delete(k)
          })
          return { success: true }
        },
        [IPC_INVOKE_CHANNEL.FORCE_CLEAR_CACHE_HARD_RELOAD]: async (data?: { tabId?: string }) => {
          const tab = data?.tabId ? this.tabController?.getTabById(data.tabId) : this.tabController?.activeTab
          if (tab?.isAlive) {
            tab.clearCache()
            tab.onReload()
          }
          return { success: true }
        },
        [IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE]: (data) => {
          this.window.webContents.send(IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE, data)
        },
        [IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED]: (data) => {
          this.window.webContents.send(IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED, data)
        },
        [IPC_RENDERER_EVENT.TRANSLATE_LANGUAGE_DETECTED]: (data) => {
          this.window.webContents.send(IPC_RENDERER_EVENT.TRANSLATE_LANGUAGE_DETECTED, data)
        },
        [IPC_RENDERER_EVENT.TRANSLATE_SELECTION_AVAILABLE]: async (data: { tabId?: string; text?: string }) => {
          // Auto-translate on text selection only runs when the toggle is enabled.
          // The context-menu flow sends the event without a tabId and stays available.
          if (data?.tabId) {
            const preference = await translateController.getPreference()
            if (!preference?.autoTranslate) return
          }
          this.window.webContents.send(IPC_RENDERER_EVENT.TRANSLATE_SELECTION_AVAILABLE, data)
        },
      }

      this.listenerHandlers = {
        [IPC_EMIT_CHANNEL.SHOW_VIEW_BY_ID]: (data) => this.handleShowViewById(data),
        [IPC_EMIT_CHANNEL.VIEW_CHANGE_URL]: (data) => this.handleURLChange(data),
        [IPC_EMIT_CHANNEL.VIEW_RESPONSIVE]: (data) => this.handleResizeView(data),
        [IPC_EMIT_CHANNEL.HIDE_VIEW]: (data) => this.handleHideView(data),
        [IPC_EMIT_CHANNEL.ON_BACKWARD]: (data) => this.onGoBack(data),
        [IPC_EMIT_CHANNEL.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
        [IPC_EMIT_CHANNEL.TOGGLE_DEV_TOOLS]: (data) => this.handleToggleDevTools(data),
        [IPC_EMIT_CHANNEL.ON_RELOAD]: (data) => this.handleReloadTab(data),
        [IPC_EMIT_CHANNEL.CLOSE_APP]: () => this.onCloseApp(),
        [IPC_EMIT_CHANNEL.REQUEST_PIP]: (data) => this.requestPIP(data),
        [IPC_EMIT_CHANNEL.PIP_EXITED]: (data) => this.handleOpenTabById(data),
        [IPC_EMIT_CHANNEL.OPEN_MEDIA_LIST]: (data) => this.openMediaList(data),
        // [IPC_EMIT_CHANNEL.TOGGLE_BOOKMARK]: (data) => this.handleToggleBookmark(data),
        // ...spotlightEmitHandlers,
        [IPC_EMIT_CHANNEL.OPEN_TAB_BY_ID]: (data) => this.handleOpenTabById(data),
        [IPC_EMIT_CHANNEL.REORDER_TABS]: (data) => this.reorderTabs(data),
        ...tabGroupEmitHandlers,
        ...spotlightInvokeHandlers,
        [IPC_EMIT_CHANNEL.SUB_WINDOW_CLOSE]: () => subWindowService.close(),
        [IPC_DOWNLOAD_EMIT.NAVIGATE_ALL]: () => {
          downloadPopup.hide()
          this.window.webContents.send('NAVIGATE_DOWNLOADS')
        },
        [IPC_DOWNLOAD_EMIT.POPUP_DISMISS]: () => downloadPopup.dismiss(),
        [SUB_WINDOW_RENDERER_EVENT.RESOLVE]: (data) => subWindowService.resolveRequest(data),
        [IPC_EMIT_CHANNEL.TOGGLE_MUTE_TAB]: (data: { tabId: string }) => {
          const tab = this.tabController?.getTabById(data.tabId)
          if (tab) tab.toggleMute()
        },
        [IPC_EMIT_CHANNEL.NOTIFICATION_TOGGLE_LIST]: () => {
          this.notificationService.toggleList()
        },
        [IPC_EMIT_CHANNEL.THEME_MODE_CHANGED]: (data: { mode: string }) => {
          nativeTheme.themeSource = data.mode === 'auto' ? 'system' : (data.mode as 'light' | 'dark')
          subWindowService.send(IPC_EMIT_CHANNEL.THEME_MODE_CHANGED, data)
        },
      }
    } catch (err) {
      console.error('initializeHandlers Error')
    }
  }

  bindingHandlersController = (args: Record<string, (viewController: ViewController, data?: any) => Promise<any>>) => {
    try {
      if (!Object.keys(args).length) return {}
      const result: Record<string, (data?: any) => Promise<any>> = {}
      for (const key in args) {
        if (Object.prototype.hasOwnProperty.call(args, key)) {
          result[key] = (data) => args[key](this, data)
        }
      }
      return result
    } catch (error) {
      return {}
    }
  }

  forwardRendererEvent(channel: string, data?: unknown) {
    this.window.webContents.send(channel, data)
  }

  syncTabsToWindows() {
    const tabs = this.getTabs() || []
    this.window.webContents.send('GET_TABS', tabs)
    this.window.webContents.send(IPC_TAB_GROUP_RENDERER_EVENT.TAB_GROUP_UPDATED, tabGroupController.getGroups())
  }

  async init() {
    try {
      downloadController.init()
      downloadController.setMainWindow(this.window)
      downloadPopup.init(this.window)
      setImmediate(() => {
        subWindowService.warmup().catch(() => {
          console.log('subWindowService warmup error')
        })
      })
      await Promise.all([
        this.initializeHandlers(),
        this.tabController?.initialize(),
        historyController.initialize(),
        tabGroupController.initialize(),
        permissionStore.initialize(),
        aiSettingsController.initialize(),
      ])
      tabGroupController.onChanged = () => this.syncTabsToWindows()
      this.window.on('focus', () => this.focusActiveTab())
      ipcMain.handle('invoke', (event, args: IPC) => this.onInvoke(args, event))
      ipcMain.on('send', (event, args: IPC) => this.onListener(args, event))

      await this.loadUserInterface()
      this.tabController?.setUserInterface(this.userInterface!)
      downloadController.setPreferences({
        downloadDirectory: this.userInterface?.downloadDirectory,
        askDownloadLocation: this.userInterface?.askDownloadLocation,
      })
      await adblocker.initializeForSession(browserSession, this.userInterface?.extension?.disabledFilters)
      this.setupDisplayMediaHandler()
      const retentionDays = Number(this.userInterface?.notificationRetentionDays) || 30
      this.notificationService.init(this.window, retentionDays, (tabId) => {
        const tab = this.tabController?.getTabById(tabId)
        if (!tab?.url) return true
        try {
          const origin = new URL(tab.url).origin
          return permissionStore.getSitePermission(origin, 'notifications') !== 'deny'
        } catch {
          return true
        }
      })
      if (this.userInterface?.extension?.adblock) {
        adblocker.isCosmeticFilteringEnabled = this.userInterface?.extension?.cosmeticFiltering ?? true
        adblocker.enable()
        this.watchAllTabWebContents()
      } else {
        adblocker.disable()
      }
      if (this.userInterface?.extension?.adblockAutoUpdate !== false) {
        const interval = (this.userInterface?.extension?.adblockAutoUpdateInterval ?? 360) * 60 * 1000
        adblocker.startAutoUpdate(interval)
      }

      Notification.getHistory().catch((e) => {
        console.error('Notification error', e)
      })
    } catch (error) {
      console.error('[ERROR] View Controller -', error)
    } finally {
      registerGMAPIHandlers()
      registerErrorHandler()
      startUpdateChecker()
      registerVaultPageIpc({
        isVaultEnabled: () => this.userInterface?.extension?.vault !== false,
        getNeverSaveDomains: () => this.userInterface?.passwordsNeverSaveDomains || [],
        findTabId: (wc) => this.tabController?.getTabByWebContents(wc)?.id,
        onCredentialDetected: (payload) => {
          this.window.webContents.send(IPC_RENDERER_EVENT.VAULT_CREDENTIAL_DETECTED, payload)
        },
      })
      initAutoUpdate((channel, data) => this.forwardRendererEvent(channel, data), {
        autoDownload: this.userInterface?.autoDownload,
      })
      subWindowService.init(this.window)
      subWindowService.onDidOpen = () => this.notificationService.ensureOnTop()
      setImmediate(() =>
        subWindowService.warmup().catch(() => {
          console.log('subWindowService warmup error')
        })
      )
    }
  }

  getTabs() {
    const response = this.tabController?.getTabs()
    return response
  }

  async getTab({ id }: { id: string }) {
    const tab = this.tabController?.getTabById(id)
    return tab?.toJSON()
  }

  private onInvoke(args: IPC, event?: Electron.IpcMainInvokeEvent) {
    const { channel, data } = args
    if (!this.isSenderAllowed(event, channel)) {
      log.error(`Blocked privileged invoke from untrusted frame: "${channel}"`)
      return undefined
    }
    try {
      const handler = this.invokeHandlers?.[channel]
      if (handler) {
        return handler(data)
      }
    } catch (error) {
      log.error(`No listener invoke for channel: "${channel}"`)
    }
  }

  private onListener(args: IPC, event?: Electron.IpcMainEvent) {
    const { channel, data } = args
    if (!this.isSenderAllowed(event, channel)) {
      log.error(`Blocked privileged emit from untrusted frame: "${channel}"`)
      return
    }
    const handler = this.listenerHandlers?.[channel]
    if (handler) {
      handler(data)
    } else {
      log.error(`No listener handler for channel: ${channel}`)
    }
  }

  private isTrustedSender(event?: { sender?: Electron.WebContents }): boolean {
    if (!event?.sender) return false
    if (event.sender === this.window.webContents) return true
    return subWindowService.getWebContents() === event.sender
  }

  private readonly privilegedChannels = new Set<string>([
    IPC_INVOKE_CHANNEL.VAULT_LIST,
    IPC_INVOKE_CHANNEL.VAULT_ADD,
    IPC_INVOKE_CHANNEL.VAULT_UPDATE,
    IPC_INVOKE_CHANNEL.VAULT_DELETE,
    IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER,
    IPC_INVOKE_CHANNEL.CLEAR_BROWSING_DATA,
    IPC_INVOKE_CHANNEL.AI_GET_API_KEY,
    IPC_INVOKE_CHANNEL.AI_SET_API_KEY,
    IPC_INVOKE_CHANNEL.AI_SET_FLOATING_BUTTON,
  ])

  private isSenderAllowed(event: { sender?: Electron.WebContents } | undefined, channel: string): boolean {
    if (!this.privilegedChannels.has(channel)) return true
    return this.isTrustedSender(event)
  }

  async createTab(tab?: Partial<ITab>) {
    if (tab?.url && !isSafeUrl(tab.url)) return undefined
    const newTab = await this.tabController?.addNewTab(tab)
    this.syncTabsToWindows()
    if (newTab?.id) {
      const tabInstance = this.tabController?.getTabById(newTab.id)
      if (tabInstance?.isAlive) {
        adblocker.watch(tabInstance.webContents)
        this.wirePopupHandler(tabInstance)
      }
      this.forwardRendererEvent('OPEN_TAB_BY_ID', { id: newTab.id })
    }
    return newTab
  }

  private watchAllTabWebContents() {
    const tabs = this.tabController?.getTabInstances() || []
    for (const tab of tabs) {
      if (tab.isAlive) {
        adblocker.watch(tab.webContents)
      }
    }
  }

  async handleShowViewById(props: IHandleResizeView) {
    try {
      if (!props?.tab.id) throw new Error('Tab id not found')
      const currentTab = this.tabController?.getTabById(props.tab?.id) as Tab
      currentTab.show()
      if (!currentTab.isAlive) {
        currentTab.createView()
        adblocker.watch(currentTab.webContents)
      }
      this.attachChildView(currentTab.view)
      const url1 = currentTab.url
      const url2 = currentTab.webContents.getURL()
      if (!isSameURl(url1, url2) && isSafeUrl(currentTab.url)) {
        currentTab.webContents.loadURL(currentTab.url)
      }
      currentTab.view.setBounds(props.screen)
      this.tabController?.setActiveTab(currentTab.id)
      this.syncTabsToWindows()
      currentTab.webContents.focus()
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab
      if (!id || !url) throw new Error('Tab id or url not found')
      const currentTab = this.tabController?.getTabById(id)
      if (!currentTab) throw new Error('Tab not found')
      if (currentTab.isHibernated) {
        currentTab.wake(isSafeUrl(url) ? url : currentTab.url)
      } else if (isSafeUrl(url)) {
        currentTab.webContents.loadURL(url)
      }
      currentTab.updateUrl(url)
      this.window.webContents.send('GET_TABS', this.getTabs())
    } catch (error) {
      console.error('Error loading URL:', error)
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props
    const currentTab = this.tabController?.getTabById(tab?.id as string)
    if (!currentTab || !currentTab.isAlive) return
    currentTab.view.setBounds(screen)
    // Restore focus once real bounds arrive (e.g. after a background-task
    // switch where the initial show happened with stale/zero bounds).
    if (currentTab.id === this.tabController?.activeTab?.id && !subWindowService.isOpen) {
      currentTab.webContents.focus()
    }
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return
      const currentTab = this.tabController?.getTabById(props.id)
      if (!currentTab || !currentTab.isAlive) return
      currentTab.hide()
      this.detachChildView(currentTab.view)
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  onGoBack(props: { data: ITab }) {
    try {
      if (!props?.data?.id) throw new Error('Tab not found')
      const currentTab = this.tabController?.getTabById(props?.data?.id)
      if (!currentTab) throw new Error('Tab not found')
      if (currentTab.webContents?.navigationHistory.canGoBack()) {
        currentTab.webContents?.navigationHistory.goBack()
      }
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  async onCloseTab(props: { id: string }) {
    try {
      if (!props || !props.id) throw new Error('Tab not found')
      const currentTab = this.tabController?.getTabById(props.id) as Tab
      if (currentTab?.isAlive) {
        currentTab.hide()
        this.detachChildView(currentTab.view)
      }
      const { nextTab } = this.tabController?.closeTab(props.id) || {}
      if (nextTab?.isAlive) this.attachChildView(nextTab?.view)
      mediaListController.removeTab(props.id)
      this.syncTabsToWindows()
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return
    const currentTab = this.tabController?.getTabById(props?.id)
    if (!currentTab || !currentTab.isAlive) return
    const view = currentTab.view
    const isOpenedDevTools = view.webContents?.isDevToolsOpened()
    view.webContents?.toggleDevTools()
    if (isOpenedDevTools) {
      view.webContents?.closeDevTools()
    } else {
      view.webContents?.openDevTools()
    }
  }

  async handleReloadTab(tab: ITab) {
    try {
      const id = tab?.id || this.tabController?.activeTab?.id
      if (!id) throw new Error('Tab not found')
      const currentTab = this.tabController?.getTabById(id)
      if (!currentTab?.isAlive) throw new Error('Tab not alive')
      return currentTab?.onReload()
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  async requestPIP({ tab, videoIndex }: { tab: ITab; videoIndex?: number }) {
    try {
      if (!tab?.id) throw new Error(`Tab id not found`)
      const currentTab = this.tabController?.getTabById(tab.id) as Tab
      if (!currentTab) throw new Error(`Tab not found`)
      if (!currentTab.isAlive) throw new Error(`Tab not alive`)
      const attached = this.isViewAttached(currentTab.view)
      const visible = currentTab.view.getVisible()
      const wasActive = currentTab.id === this.tabController?.activeTab?.id
      if (!attached || !visible) {
        if (!attached) this.attachChildView(currentTab.view)
        currentTab.show()
        currentTab.webContents.focus()
      }
      const result = await currentTab.onRequestPIP(videoIndex)
      if (!result?.ok) {
        console.warn('[media] requestPIP failed:', result?.reason, 'tab', currentTab.id.slice(0, 8))
      }
      if (!attached && !wasActive) {
        this.detachChildView(currentTab.view)
      }
      return result
    } catch (error) {
      return new ErrorServices(error)
    }
  }

  openMediaList(data?: { anchor?: { x: number; y: number } }) {
    const activeTabId = this.tabController?.activeTab?.id
    const tabs = mediaListController.getAggregate(activeTabId)
    subWindowService.open('/media-list', { activeTabId, tabs, anchor: data?.anchor })
  }

  // handleToggleBookmark({ url, id }: { url: string; id: string }) {}

  async loadUserInterface() {
    const defaultData: IUserInterface = {
      layout: 'FLOATING',
      mode: 'light',
      savedCookies: '0',
      extension: {
        adblock: true,
        vault: true,
        translate: true,
        userscript: true,
        cosmeticFiltering: true,
        disabledFilters: [],
        customFilters: [],
        adblockAutoUpdate: true,
        adblockAutoUpdateInterval: 360,
      },
      hibernateMode: 'normal',
      hibernateCustomMinutes: 60,
      autoDownload: true,
      notificationRetentionDays: '30',
      passwordsNeverSaveDomains: [],
      askDownloadLocation: false,
      blockPopups: true,
    }
    try {
      const userInterface = await cacheSystem.get<IUserInterface>('interface', () => {
        const rows = appDb.query<{ key: string; value: string }>(
          "SELECT key, value FROM app_state WHERE key LIKE 'ui_%'"
        )
        const data: Record<string, any> = {}
        for (const row of rows) {
          const k = row.key.replace(/^ui_/, '')
          try {
            data[k] = JSON.parse(row.value)
          } catch {
            data[k] = row.value
          }
        }
        return data as IUserInterface
      })
      const merged = { ...defaultData, ...userInterface }
      this.userInterface = merged
      if (merged.historyRetentionDays) {
        historyController.setRetentionDays(Number(merged.historyRetentionDays))
      }
      if (merged.hibernateMode) {
        this.tabController?.setHibernateMode(merged.hibernateMode, merged.hibernateCustomMinutes)
      }
      const notificationRetentionDays = Number(merged.notificationRetentionDays) || 30
      this.notificationService.setRetentionDays(notificationRetentionDays)
      return merged
    } catch (error) {
      return defaultData
    }
  }

  async getActiveTabPageText(): Promise<string> {
    try {
      const activeTab = this.tabController?.activeTab
      if (!activeTab?.isAlive) return ''
      const result = await activeTab.webContents.executeJavaScript("document.body?.innerText || ''")
      return result || ''
    } catch (error) {
      log.error('Failed to get page text:', error)
      return ''
    }
  }

  async getActiveTabSelectedText(): Promise<string> {
    try {
      const activeTab = this.tabController?.activeTab
      if (!activeTab?.isAlive) return ''
      const result = await activeTab.webContents.executeJavaScript("window.getSelection()?.toString() || ''")
      return result || ''
    } catch (error) {
      log.error('Failed to get selected text:', error)
      return ''
    }
  }

  async persist() {
    // Save tab state to DB (non-critical for cookies)
    try {
      const tabs = this.getTabs()
      const index = this.tabController?.index || 0
      const activeTabId = this.tabController?.activeTab?.id || null
      const tabGroups = tabGroupController.getGroups()
      appDb.transaction(() => {
        appDb.run('DELETE FROM tabs')
        for (const tab of tabs || []) {
          appDb.run(
            'INSERT OR REPLACE INTO tabs (id, title, url, is_pinned, is_focused, "index", favicon, timestamp, is_bookmarked, is_hibernated, prevent_hibernate, group_id, audible, is_muted, is_using_camera, is_using_microphone, is_using_screen_share, blocked_notifications, blocked_popups, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
              tab.blockedPopups ? JSON.stringify(tab.blockedPopups) : JSON.stringify(0),
              tab.error ? JSON.stringify(tab.error) : null,
            ]
          )
        }
        appDb.run("DELETE FROM app_state WHERE key IN ('tab_index', 'active_tab_id')")
        appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('tab_index', ?)", [JSON.stringify(index)])
        appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_tab_id', ?)", [
          JSON.stringify(activeTabId),
        ])
        appDb.run('DELETE FROM tab_groups')
        for (const group of tabGroups || []) {
          appDb.run(
            'INSERT OR REPLACE INTO tab_groups (id, name, color, hidden, collapsed, created_at, updated_at, tab_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [
              group.id,
              group.name,
              group.color,
              group.hidden ? 1 : 0,
              group.collapsed ? 1 : 0,
              group.createdAt,
              group.updatedAt,
              JSON.stringify(group.tabIds),
            ]
          )
        }
      })
    } catch (error) {
      log.error('persist: failed to save tab state', error)
    }

    // Always flush cookies and storage data — critical for session persistence
    try {
      if (this.minusSession) {
        await Promise.all([this.minusSession.cookies.flushStore(), this.minusSession.flushStorageData()])
      } else {
        log.error('persist: minusSession is undefined, cannot flush cookies')
      }
    } catch (error) {
      log.error('persist: failed to flush session storage', error)
    }

    try {
      this.window.webContents?.send('SYNC')
    } catch {
      // window may already be closing
    }
  }

  openSpotlight(payload?: { query?: string }) {
    subWindowService.open('/spotlight', {
      query: payload?.query || this.tabController?.activeTab?.url || this.tabController?.activeTab?.title || '',
      activeTabId: this.tabController?.activeTab?.id,
    })
  }

  closeSpotlight() {
    subWindowService.close()
  }

  togglePinTab(data: { id: string }) {
    this.tabController?.togglePinTab(data.id)
    this.syncTabsToWindows()
  }

  togglePreventHibernate(data: { id: string }) {
    this.tabController?.togglePreventHibernate(data.id)
    this.syncTabsToWindows()
  }

  reorderTabs(data: { orderedIds: string[] }) {
    this.tabController?.reorderTabs(data.orderedIds)
    this.syncTabsToWindows()
  }

  handleOpenTabById(data: { id: string }) {
    if (!data?.id) return
    const tab = this.tabController?.getTabById(data.id)
    if (tab?.isHibernated) tab.wake()
    this.forwardRendererEvent('OPEN_TAB_BY_ID', { id: data.id })
    this.tabController?.setActiveTab(data.id)
    this.syncTabsToWindows()
    // Focus the newly active tab's webContents directly in the main process.
    // Tab switches from the main process (Ctrl+Tab, notifications, ...) must not
    // depend on the renderer round-trip, which is delayed while the window is a
    // background task - without this, focus-dependent features (PIP, ...) fail.
    this.ensureActiveTabFocus()
  }

  private ensureActiveTabFocus() {
    const tab = this.tabController?.activeTab
    if (!tab?.isAlive || subWindowService.isOpen) return
    try {
      if (!this.isViewAttached(tab.view)) {
        // Reuse the currently visible tab's bounds so the view can be shown
        // immediately instead of waiting for the (possibly throttled) renderer.
        const visible = this.tabController
          ?.getTabInstances()
          .find((t) => t.isAlive && t.id !== tab.id && this.isViewAttached(t.view))
        const bounds = visible?.view.getBounds()
        if (bounds?.width && bounds?.height) tab.view.setBounds(bounds)
        this.attachChildView(tab.view)
      }
      tab.show()
      tab.webContents.focus()
    } catch (error) {
      log.error('Failed to focus active tab', error)
    }
  }

  private isViewAttached(view: WebContentsView): boolean {
    return this.window.contentView.children.includes(view)
  }

  switchTab(direction: 1 | -1) {
    const allTabs = this.tabController?.getTabInstances() || []

    // Tabs of hidden groups are not visible in the sidebar - skip them
    const hiddenGroupTabIds = this.getHiddenGroupTabIds()
    const tabs = allTabs.filter((t) => t.isPinned || !hiddenGroupTabIds.has(t.id))

    if (tabs.length < 2) return
    const activeIndex = tabs.findIndex((t) => t.id === this.tabController?.activeTab?.id)
    const startIndex = activeIndex === -1 ? 0 : activeIndex
    const count = tabs.length
    let targetIndex = startIndex + direction
    if (targetIndex >= count) targetIndex = 0
    if (targetIndex < 0) targetIndex = count - 1
    const targetTab = tabs[targetIndex]
    if (!targetTab) return
    this.handleOpenTabById({ id: targetTab.id })
  }

  private getHiddenGroupTabIds(): Set<string> {
    const hiddenTabIds = new Set<string>()
    for (const group of tabGroupController.getGroups()) {
      if (!group.hidden) continue
      for (const id of group.tabIds) hiddenTabIds.add(id)
    }
    return hiddenTabIds
  }

  focusActiveTab() {
    const tab = this.tabController?.activeTab
    if (!tab?.isAlive || !tab.view?.getVisible()) return
    if (subWindowService.isOpen) return
    tab.webContents.focus()
  }

  attachChildView(view: WebContentsView) {
    if (this.isViewAttached(view)) return
    eventStore.broadcast('viewChanges', view)
    this.window.contentView.addChildView(view)
    if (subWindowService.isOpen) {
      subWindowService.ensureOnTop()
    }
    // Install the popup-blocker policy for the attached tab (idempotent).
    const tab = this.findTabByWebContents(view.webContents)
    if (tab) this.wirePopupHandler(tab)
    // Notification layer (zIndex=3) always on top of everything
    this.setupPermissionHandler(view)
    this.notificationService.ensureOnTop()
  }

  detachChildView(view: WebContentsView) {
    eventStore.broadcast('viewChanges', undefined)
    this.window.contentView.removeChildView(view)
  }

  async onCloseApp() {
    try {
      await this.persist()
    } catch (error) {
      log.error('Failed to persist before quit', error)
    } finally {
      app.quit()
    }
  }

  async interfaceSave(data: IUserInterface) {
    cacheSystem.set('interface', data)
    appDb.transaction(() => {
      appDb.run("DELETE FROM app_state WHERE key LIKE 'ui_%'")
      for (const [key, value] of Object.entries(data)) {
        appDb.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [`ui_${key}`, JSON.stringify(value)])
      }
    })

    if (data.hibernateMode) {
      this.tabController?.setHibernateMode(data.hibernateMode, data.hibernateCustomMinutes)
    }

    if (data.notificationRetentionDays) {
      this.notificationService.setRetentionDays(Number(data.notificationRetentionDays))
    }

    const prev = this.userInterface?.extension
    const next = data.extension
    this.userInterface = data

    downloadController.setPreferences({
      downloadDirectory: data.downloadDirectory,
      askDownloadLocation: data.askDownloadLocation,
    })

    if (prev && next) {
      adblocker.isCosmeticFilteringEnabled = next.cosmeticFiltering ?? true

      const filtersChanged =
        JSON.stringify([...next.disabledFilters].sort()) !== JSON.stringify([...prev.disabledFilters].sort()) ||
        JSON.stringify(next.customFilters ?? []) !== JSON.stringify(prev.customFilters ?? [])

      if (next.adblock && !prev.adblock) {
        if (next.customFilters?.length) {
          await adblocker.setCustomFilters(next.customFilters)
        }
        await adblocker.initialize(next.disabledFilters)
        adblocker.enable()
        this.watchAllTabWebContents()
      } else if (!next.adblock && prev.adblock) {
        adblocker.disable()
      } else if (next.adblock && prev.adblock) {
        if (filtersChanged) {
          adblocker.disable()
          if (next.customFilters?.length) {
            await adblocker.setCustomFilters(next.customFilters)
          }
          await adblocker.initialize(next.disabledFilters)
          adblocker.enable()
          this.watchAllTabWebContents()
        }
      }

      if (
        next.adblockAutoUpdate !== prev.adblockAutoUpdate ||
        next.adblockAutoUpdateInterval !== prev.adblockAutoUpdateInterval
      ) {
        if (next.adblockAutoUpdate !== false) {
          const interval = (next.adblockAutoUpdateInterval ?? 360) * 60 * 1000
          adblocker.startAutoUpdate(interval)
        } else {
          adblocker.stopAutoUpdate()
        }
      }
    }
  }

  private setupDisplayMediaHandler() {
    browserSession.setDisplayMediaRequestHandler(
      (request, callback) => {
        const wc = request.frame ? webContents.fromFrame(request.frame) : undefined
        if (wc) {
          const tab = this.findTabByWebContents(wc)
          if (tab) {
            tab.isUsingScreenShare = true
            tab.persistInformationToRenderer({ isUsingScreenShare: true })
          }
        }
        const stream = request.frame || undefined
        callback({ video: stream })
      },
      { useSystemPicker: true }
    )
  }

  private pendingPermissions: Array<{
    permissionId: number
    webContents: Electron.WebContents
    origin: string
    permission: string
  }> = []

  private nextPermissionId = 1

  private extractHostname(url: string): string | null {
    try {
      return new URL(url).hostname
    } catch {
      return null
    }
  }

  private isPermissionGrantedForOrigin(requestOrigin: string, permission: string, details: any): boolean {
    const stored = permissionStore.getSitePermission(requestOrigin, permission as PermissionType)
    if (stored === 'grant') return true

    if (permission === 'media') {
      const mediaTypes: string[] = details.mediaTypes || (details.mediaType ? [details.mediaType] : [])
      if (
        mediaTypes.length > 0 &&
        mediaTypes.every(
          (t: string) => permissionStore.getSitePermission(requestOrigin, `media:${t}` as PermissionType) === 'grant'
        )
      ) {
        return true
      }
    }

    return false
  }

  private hasPendingRequestForOrigin(requestOrigin: string, permission: string): boolean {
    return this.pendingPermissions.some((p) => p.origin === requestOrigin && p.permission === permission)
  }

  private removePermissionsForContents(wc: Electron.WebContents) {
    this.pendingPermissions = this.pendingPermissions.filter((p) => p.webContents !== wc)
    const tab = this.findTabByWebContents(wc)
    if (tab) {
      tab.isUsingCamera = false
      tab.isUsingMicrophone = false
      tab.isUsingScreenShare = false
      tab.persistInformationToRenderer({
        isUsingCamera: false,
        isUsingMicrophone: false,
        isUsingScreenShare: false,
      })
    }
  }

  private setupPermissionHandler(view: WebContentsView) {
    const wc = view.webContents
    const session = wc.session

    session.setPermissionRequestHandler(async (wc, permission, request, details) => {
      const permissionType = permission as PermissionType

      const autoGrantPermissions: PermissionType[] = [
        'clipboard-write',
        'clipboard-sanitized-write',
        'pointerLock',
        'fullscreen',
        'midi',
        'midiSysex',
      ]
      if (autoGrantPermissions.includes(permissionType)) {
        return request(true)
      }

      if (!details.isMainFrame) {
        return request(false)
      }

      if (!details.requestingUrl) {
        return request(false)
      }

      const hostname = this.extractHostname(details.requestingUrl)
      if (!hostname) {
        return request(false)
      }

      const supportedPermissions = ['media', 'notifications', 'pointerLock']
      if (!supportedPermissions.includes(permissionType)) {
        return request(false)
      }

      if (this.isPermissionGrantedForOrigin(hostname, permissionType, details)) {
        return request(true)
      }

      if (permissionType === 'notifications' && this.hasPendingRequestForOrigin(hostname, permissionType)) {
        return request(false)
      }

      const stored = permissionStore.getSitePermission(hostname, permissionType)
      if (stored === 'deny') {
        if (permissionType === 'notifications') this.trackBlockedNotification(wc)
        return request(false)
      }

      const permissionId = this.nextPermissionId++
      this.pendingPermissions.push({ permissionId, webContents: wc, origin: hostname, permission: permissionType })

      try {
        const result = await subWindowService.openWithResult('/permission', {
          permission: permissionType,
          origin: hostname,
        })
        const { decision, remember } = result || {}

        this.pendingPermissions = this.pendingPermissions.filter((p) => p.permissionId !== permissionId)

        if (remember) {
          const reqDetails = details as any
          if (permissionType === 'media' && reqDetails.mediaTypes) {
            for (const type of reqDetails.mediaTypes) {
              permissionStore.setSitePermission(
                hostname,
                `media:${type}` as PermissionType,
                decision ? 'grant' : 'deny'
              )
            }
          }
          permissionStore.setSitePermission(hostname, permissionType, decision ? 'grant' : 'deny')
        }

        if (!decision && permissionType === 'notifications') {
          this.trackBlockedNotification(wc)
        }
        request(!!decision)
      } catch {
        this.pendingPermissions = this.pendingPermissions.filter((p) => p.permissionId !== permissionId)
        request(false)
      }
    })

    session.setPermissionCheckHandler((wc, permission, requestingOrigin, details) => {
      if (permission === 'clipboard-sanitized-write') {
        return true
      }

      if (!details.isMainFrame && requestingOrigin !== details.embeddingOrigin) {
        return false
      }

      if (!requestingOrigin) {
        return false
      }

      const hostname = this.extractHostname(requestingOrigin)
      if (!hostname) return false

      return this.isPermissionGrantedForOrigin(hostname, permission, details)
    })

    wc.on('did-start-navigation', (_e, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) {
        this.removePermissionsForContents(wc)
      }
    })
    wc.once('destroyed', () => {
      this.removePermissionsForContents(wc)
    })
  }

  private findTabByWebContents(wc: Electron.WebContents): Tab | undefined {
    const tabs = this.tabController?.getTabInstances() || []
    return tabs.find((t) => t.isAlive && t.webContents?.id === wc.id)
  }

  private trackBlockedNotification(wc: Electron.WebContents) {
    const tab = this.findTabByWebContents(wc)
    if (tab) {
      tab.blockedNotifications += 1
      tab.persistInformationToRenderer({ blockedNotifications: tab.blockedNotifications })
    }
  }

  /** Route window.open requests through the popup-blocker policy. */
  private wirePopupHandler(tab: Tab) {
    tab.onWindowOpen = (request) => this.handleWindowOpen(tab, request)
  }

  private openPopupAsTab(url: string) {
    this.createTab({ url }).catch((err) => log.error('[popup] failed to open popup as tab', err))
  }

  /** Applies the Chrome-style popup policy: global toggle → site permission →
   *  prompt (ask). Allowed popups are opened as regular tabs; blocked ones are
   *  counted on the tab. */
  private handleWindowOpen(tab: Tab, request: WindowOpenRequest) {
    if (!tab || !request?.url) return
    if (!isSafeUrl(request.url)) return

    const blockPopups = this.userInterface?.blockPopups !== false
    const openerOrigin = this.getPopupOrigin(tab)

    // Popup blocking disabled, or no origin to attribute the request to.
    if (!blockPopups || !openerOrigin) {
      this.openPopupAsTab(request.url)
      return
    }

    const decision = permissionStore.getSitePermission(openerOrigin, 'popups')
    if (decision === 'grant') {
      this.openPopupAsTab(request.url)
      return
    }
    if (decision === 'deny') {
      this.trackBlockedPopup(tab)
      return
    }

    // No remembered decision → ask the user.
    this.promptPopup(tab, openerOrigin, request.url).catch((err) => {
      log.error('[popup] popup request prompt failed', err)
      this.trackBlockedPopup(tab)
    })
  }

  /** Origin of the page that initiated the popup (the one to attribute the
   *  permission to). */
  private getPopupOrigin(tab: Tab): string | null {
    try {
      const currentUrl = tab.webContents?.getURL() || tab.url
      return new URL(currentUrl).origin
    } catch {
      return null
    }
  }

  private async promptPopup(tab: Tab, openerOrigin: string, url: string) {
    let result: { decision?: 'allow' | 'block'; remember?: boolean } | null = null
    try {
      result = await subWindowService.openWithResult('/popup', { origin: openerOrigin, url })
    } catch {
      // Closed or timed out without a decision → treat as blocked.
      this.trackBlockedPopup(tab)
      return
    }

    const decision = result?.decision === 'allow' ? 'allow' : 'block'
    if (result?.remember) {
      permissionStore.setSitePermission(openerOrigin, 'popups', decision === 'allow' ? 'grant' : 'deny')
    }

    if (decision === 'allow') {
      this.openPopupAsTab(url)
    } else {
      this.trackBlockedPopup(tab)
    }
  }

  private trackBlockedPopup(tab: Tab) {
    tab.blockedPopups += 1
    tab.persistInformationToRenderer({ blockedPopups: tab.blockedPopups })
    // Ensure non-active tabs' count also reaches the sidebar.
    this.window.webContents.send('GET_TABS', this.getTabs())
  }

  showNotification({ title, description }: { title: string; description: string }) {
    return new Notification({
      title: title,
      body: description,
    }).show()
  }
}
