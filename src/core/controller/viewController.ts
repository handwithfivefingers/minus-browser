import { app, BrowserWindow, ipcMain, Notification, WebContentsView } from "electron";
import log from "electron-log";
import { historyController, HistoryRoute } from "~/core/controller/history";
import { TodoRoute } from "~/core/controller/todo";
import { IHandleResizeView, IPC, ITab } from "~/core/interfaces";
import { ErrorServices } from "~/core/services/error.services";
import { browserSession } from "~/core/services/session";
import { appDb, eventStore } from "~/core/stores";
import { permissionStore } from "~/core/stores/permission.store";
import { isSameURl } from "~/core/utils";
import { adblocker } from "~/features/adblocker/plugin";
import { checkForUpdates, initAutoUpdate, quitAndInstall } from "~/features/autoUpdate/autoUpdate.init";
import { cacheSystem } from "~/features/cacheSystem";
import { NotificationService } from "~/features/notification/service";
import { SearchRoute, searchController as splitSearchController } from "~/features/search";
import {
  spotlightEmitHandlers,
  spotlightInvokeHandlers,
  tabGroupEmitHandlers,
  tabGroupInvokeHandlers,
  translateInvokeHandlers,
  userScriptInvokeHandlers,
  vaultInvokeHandlers,
} from "~/features/sub-window/ipc";
import { registerGMAPIHandlers } from "~/features/userscript/gm-api";
import { registerErrorHandler } from "~/features/userscript/services/error-service";
import { startUpdateChecker } from "~/features/userscript/services/update-service";
import { captureInvokeHandlers } from "~/features/sub-window/ipc/capture-hanlers";
import { subWindowService } from "~/features/sub-window/service";
import { tabGroupController } from "~/features/tabGroup";
import { TabController } from "~/features/tabs/controllers";
import { Tab } from "~/features/tabs/models/tab";
import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from "~/shared/constants/ipc";
import { SUB_WINDOW_INVOKE, SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_RENDERER_EVENT } from "~/shared/constants/ipc/tabGroup";
import { IUserInterface, PermissionDecision, PermissionType } from "~/shared/types";

export type EmitToRenderer = (channel: string, data?: unknown) => void;
export class ViewController {
  window: BrowserWindow;
  wc: Electron.WebContents | undefined;
  minusSession: Electron.Session | undefined = browserSession;
  userInterface: IUserInterface | undefined = undefined;
  tabController: TabController | undefined;
  searchController = splitSearchController;
  lastCaptureImage: Electron.NativeImage | null = null;
  private invokeHandlers: Record<string, (data?: any) => any> | undefined;
  private listenerHandlers: Record<string, (data?: any) => void> | undefined;
  private initPromise: Promise<void>;
  private notificationService = new NotificationService();

  constructor(window: BrowserWindow) {
    this.tabController = new TabController((payload) => this.onInvoke(payload));
    this.window = window;
    this.initPromise = this.init();
  }

  async ready(): Promise<void> {
    return this.initPromise;
  }

  handleClickNotification(notification: Electron.ActivationArguments) {}

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
        ...translateInvokeHandlers,
        ...userScriptInvokeHandlers,
        ...SearchRoute,
        ...HistoryRoute,
        ...TodoRoute,
        ...spotlightInvokeHandlers,
        ...tabGroupInvokeHandlers,
        ...this.bindingHandlersController(captureInvokeHandlers),
        [IPC_INVOKE_CHANNEL.OPEN_SITE_INFO]: (data) => {
          subWindowService.open("/site-info", data);
          return { success: true };
        },
        ...adblocker.getInvokeHandlers(),
        [IPC_TAB_GROUP_INVOKE.HIDE_GROUP]: async (id: string) => {
          const group = tabGroupController.getGroups().find((g) => g.id === id);
          if (!group) return { success: true };

          const tabIds = group.tabIds;

          // If active tab is in this group, switch to another tab first
          const activeTab = this.tabController?.activeTab;
          if (activeTab && tabIds.includes(activeTab.id)) {
            const allTabs = this.tabController?.getTabInstances() || [];
            const targetTab = allTabs.find((t) => t.id && !tabIds.includes(t.id));
            if (targetTab) {
              if (targetTab.isHibernated) targetTab.wake();
              this.tabController?.setActiveTab(targetTab.id);
              this.forwardRendererEvent("OPEN_TAB_BY_ID", { id: targetTab.id });
            } else {
              await this.createTab({});
            }
          }

          // Hibernate all non-pinned tabs in the group
          this.tabController?.hibernateTabs(tabIds);

          // Hide the group (triggers onChanged → syncTabsToWindows)
          await tabGroupController.hideGroup(id);

          return { success: true };
        },
        [IPC_INVOKE_CHANNEL.GET_SITE_PERMISSIONS]: (data: { origin: string; all?: boolean }) => {
          if (data?.all) {
            return permissionStore.getAllSites();
          }
          return permissionStore.getSitePermissions(data?.origin || "");
        },
        [IPC_INVOKE_CHANNEL.SET_SITE_PERMISSION]: (data: {
          origin: string;
          permission: PermissionType;
          decision: PermissionDecision;
        }) => {
          permissionStore.setSitePermission(data.origin, data.permission, data.decision);
          return { success: true };
        },
        [IPC_INVOKE_CHANNEL.RESET_SITE_PERMISSION]: (data: { origin: string; permission: PermissionType }) => {
          permissionStore.resetSitePermission(data.origin, data.permission);
          return { success: true };
        },
        [SUB_WINDOW_INVOKE.RESOLVE]: (data) => subWindowService.resolveRequest(data),
        [IPC_INVOKE_CHANNEL.RESET_ALL_PERMISSIONS]: () => {
          permissionStore.resetAllPermissions();
          return { success: true };
        },
        [IPC_INVOKE_CHANNEL.AI_GET_PAGE_TEXT]: () => this.getActiveTabPageText(),
        [IPC_INVOKE_CHANNEL.AI_GET_SELECTED_TEXT]: () => this.getActiveTabSelectedText(),
        [IPC_INVOKE_CHANNEL.TOGGLE_PIN_TAB]: (data) => this.togglePinTab(data),
        [IPC_INVOKE_CHANNEL.TOGGLE_PREVENT_HIBERNATE]: (data) => this.togglePreventHibernate(data),
        [IPC_INVOKE_CHANNEL.CHECK_FOR_UPDATE]: () => {
          checkForUpdates();
          return { success: true };
        },
        [IPC_INVOKE_CHANNEL.QUIT_AND_INSTALL_UPDATE]: () => {
          quitAndInstall();
          return { success: true };
        },
        [IPC_EMIT_CHANNEL.PIP_EXITED]: (data) => this.handleOpenTabById(data),
        [IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE]: (data) => {
          this.window.webContents.send(IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE, data);
        },
      };

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
        [IPC_EMIT_CHANNEL.TOGGLE_BOOKMARK]: (data) => this.handleToggleBookmark(data),
        ...spotlightEmitHandlers,
        [IPC_EMIT_CHANNEL.OPEN_TAB_BY_ID]: (data) => this.handleOpenTabById(data),
        [IPC_EMIT_CHANNEL.REORDER_TABS]: (data) => this.reorderTabs(data),
        ...tabGroupEmitHandlers,
        [IPC_EMIT_CHANNEL.SUB_WINDOW_CLOSE]: () => subWindowService.close(),
        [SUB_WINDOW_RENDERER_EVENT.RESOLVE]: (data) => subWindowService.resolveRequest(data),
        [IPC_EMIT_CHANNEL.TOGGLE_MUTE_TAB]: (data: { tabId: string }) => {
          const tab = this.tabController?.getTabById(data.tabId);
          if (tab) tab.toggleMute();
        },
        [IPC_EMIT_CHANNEL.NOTIFICATION_TOGGLE_LIST]: () => {
          this.notificationService.toggleList();
        },
      };
    } catch (err) {
      console.error("initializeHandlers Error");
    }
  }

  bindingHandlersController = (args: Record<string, (viewController: ViewController, data?: any) => Promise<any>>) => {
    try {
      if (!Object.keys(args).length) return {};
      const result: Record<string, (data?: any) => Promise<any>> = {};
      for (const key in args) {
        if (Object.prototype.hasOwnProperty.call(args, key)) {
          result[key] = (data) => args[key](this, data);
        }
      }
      return result;
    } catch (error) {
      return {};
    }
  };

  forwardRendererEvent(channel: string, data?: unknown) {
    this.window.webContents.send(channel, data);
  }

  syncTabsToWindows() {
    const tabs = this.getTabs() || [];
    this.window.webContents.send("GET_TABS", tabs);
    this.window.webContents.send(IPC_TAB_GROUP_RENDERER_EVENT.TAB_GROUP_UPDATED, tabGroupController.getGroups());
  }

  async init() {
    try {
      await Promise.all([
        this.initializeHandlers(),
        this.tabController?.initialize(),
        historyController.initialize(),
        tabGroupController.initialize(),
        permissionStore.initialize(),
      ]);
      tabGroupController.onChanged = () => this.syncTabsToWindows();
      ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
      ipcMain.on("send", (event, args: IPC) => this.onListener(args));

      await this.loadUserInterface();
      this.tabController?.setUserInterface(this.userInterface!);
      await adblocker.initializeForSession(browserSession, this.userInterface?.extension?.disabledFilters);
      const retentionDays = Number(this.userInterface?.notificationRetentionDays) || 30;
      this.notificationService.init(this.window, retentionDays);
      if (this.userInterface?.extension?.adblock) {
        adblocker.isCosmeticFilteringEnabled = this.userInterface?.extension?.cosmeticFiltering ?? true;
        adblocker.enable();
        this.watchAllTabWebContents();
      } else {
        adblocker.disable();
      }
      if (this.userInterface?.extension?.adblockAutoUpdate !== false) {
        const interval = (this.userInterface?.extension?.adblockAutoUpdateInterval ?? 360) * 60 * 1000;
        adblocker.startAutoUpdate(interval);
      }

      Notification.getHistory().catch((e) => {
        console.error("Notification error", e);
      });
    } catch (error) {
      console.error("[ERROR] View Controller -", error);
    } finally {
      registerGMAPIHandlers();
      registerErrorHandler();
      startUpdateChecker();
      initAutoUpdate((channel, data) => this.forwardRendererEvent(channel, data), {
        autoDownload: this.userInterface?.autoDownload,
      });
      subWindowService.init(this.window);
      subWindowService.onDidOpen = () => this.notificationService.ensureOnTop();
      setImmediate(() => subWindowService.warmup().catch(() => {}));
    }
  }

  getTabs() {
    const response = this.tabController?.getTabs();
    return response;
  }

  async getTab({ id }: { id: string }) {
    const tab = this.tabController?.getTabById(id);
    return tab?.toJSON();
  }

  private onInvoke(args: IPC) {
    try {
      const { channel, data } = args;
      const handler = this.invokeHandlers?.[channel];
      if (handler) {
        return handler(data);
      }
    } catch (error) {
      console.error("[ERRROR] INVOKE :", error);
    }
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    const handler = this.listenerHandlers?.[channel];
    if (handler) {
      handler(data);
    } else {
      log.error(`No listener handler for channel: ${channel}`);
    }
  }

  async createTab(tab?: Partial<ITab>) {
    const newTab = await this.tabController?.addNewTab(tab);
    this.syncTabsToWindows();
    if (newTab?.id) {
      const tabInstance = this.tabController?.getTabById(newTab.id);
      if (tabInstance?.isAlive) {
        adblocker.watch(tabInstance.webContents);
      }
      this.forwardRendererEvent("OPEN_TAB_BY_ID", { id: newTab.id });
    }
    return newTab;
  }

  private watchAllTabWebContents() {
    const tabs = this.tabController?.getTabInstances() || [];
    for (const tab of tabs) {
      if (tab.isAlive) {
        adblocker.watch(tab.webContents);
      }
    }
  }

  async handleShowViewById(props: IHandleResizeView) {
    try {
      if (!props?.tab.id) throw new Error("Tab id not found");
      const currentTab = this.tabController?.getTabById(props.tab?.id) as Tab;
      currentTab.show();
      if (!currentTab.isAlive) {
        currentTab.createView();
        adblocker.watch(currentTab.webContents);
      }
      this.attachChildView(currentTab.view);
      const url1 = currentTab.url;
      const url2 = currentTab.webContents.getURL();
      if (!isSameURl(url1, url2)) {
        currentTab.webContents.loadURL(currentTab.url);
      }
      currentTab.view.setBounds(props.screen);
      this.tabController?.setActiveTab(currentTab.id);
      this.syncTabsToWindows();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab;
      if (!id || !url) throw new Error("Tab id or url not found");
      const currentTab = this.tabController?.getTabById(id);
      if (!currentTab) throw new Error("Tab not found");
      if (currentTab.isHibernated) {
        currentTab.wake(url);
      } else {
        currentTab.webContents.loadURL(url);
      }
      currentTab.updateUrl(url);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      console.error("Error loading URL:", error);
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    const currentTab = this.tabController?.getTabById(tab?.id as string);
    if (!currentTab || !currentTab.isAlive) return;
    currentTab.view.setBounds(screen);
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return;
      const currentTab = this.tabController?.getTabById(props.id);
      if (!currentTab || !currentTab.isAlive) return;
      currentTab.hide();
      this.detachChildView(currentTab.view);
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  onGoBack(props: { data: ITab }) {
    try {
      if (!props?.data?.id) throw new Error("Tab not found");
      const currentTab = this.tabController?.getTabById(props?.data?.id);
      if (!currentTab) throw new Error("Tab not found");
      if (currentTab.webContents?.navigationHistory.canGoBack()) {
        currentTab.webContents?.navigationHistory.goBack();
      }
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async onCloseTab(props: { id: string }) {
    try {
      if (!props || !props.id) throw new Error("Tab not found");
      const currentTab = this.tabController?.getTabById(props.id) as Tab;
      if (currentTab?.isAlive) {
        currentTab.hide();
        this.detachChildView(currentTab.view);
      }
      const { nextTab } = this.tabController?.closeTab(props.id) || {};
      if (nextTab?.isAlive) this.attachChildView(nextTab?.view);
      this.syncTabsToWindows();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const currentTab = this.tabController?.getTabById(props?.id);
    if (!currentTab || !currentTab.isAlive) return;
    const view = currentTab.view;
    let isOpenedDevTools = view.webContents?.isDevToolsOpened();
    view.webContents?.toggleDevTools();
    if (isOpenedDevTools) {
      view.webContents?.closeDevTools();
    } else {
      view.webContents?.openDevTools();
    }
  }

  async handleReloadTab(tab: ITab) {
    try {
      let id = tab?.id || this.tabController?.activeTab?.id;
      if (!id) throw new Error("Tab not found");
      const currentTab = this.tabController?.getTabById(id);
      if (!currentTab?.isAlive) throw new Error("Tab not alive");
      return currentTab?.onReload();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async requestPIP({ tab }: { tab: ITab }) {
    try {
      if (!tab?.id) throw new Error(`Tab id not found`);
      const currentTab = this.tabController?.getTabById(tab.id);
      return currentTab?.onRequestPIP();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleToggleBookmark({ url, id }: { url: string; id: string }) {}

  async loadUserInterface() {
    const defaultData: IUserInterface = {
      layout: "FLOATING",
      mode: "light",
      savedCookies: "0",
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
      hibernateMode: "normal",
      hibernateCustomMinutes: 60,
      autoDownload: true,
      notificationRetentionDays: "30",
    };
    try {
      const userInterface = await cacheSystem.get<IUserInterface>("interface", () => {
        const rows = appDb.query<{ key: string; value: string }>(
          "SELECT key, value FROM app_state WHERE key LIKE 'ui_%'",
        );
        const data: Record<string, any> = {};
        for (const row of rows) {
          const k = row.key.replace(/^ui_/, "");
          try {
            data[k] = JSON.parse(row.value);
          } catch {
            data[k] = row.value;
          }
        }
        return data as IUserInterface;
      });
      const merged = { ...defaultData, ...userInterface };
      this.userInterface = merged;
      if (merged.historyRetentionDays) {
        historyController.setRetentionDays(Number(merged.historyRetentionDays));
      }
      if (merged.hibernateMode) {
        this.tabController?.setHibernateMode(merged.hibernateMode, merged.hibernateCustomMinutes);
      }
      const notificationRetentionDays = Number(merged.notificationRetentionDays) || 30;
      this.notificationService.setRetentionDays(notificationRetentionDays);
      return merged;
    } catch (error) {
      return defaultData;
    }
  }

  async getActiveTabPageText(): Promise<string> {
    try {
      const activeTab = this.tabController?.activeTab;
      if (!activeTab?.isAlive) return "";
      const result = await activeTab.webContents.executeJavaScript("document.body?.innerText || ''");
      return result || "";
    } catch (error) {
      log.error("Failed to get page text:", error);
      return "";
    }
  }

  async getActiveTabSelectedText(): Promise<string> {
    try {
      const activeTab = this.tabController?.activeTab;
      if (!activeTab?.isAlive) return "";
      const result = await activeTab.webContents.executeJavaScript("window.getSelection()?.toString() || ''");
      return result || "";
    } catch (error) {
      log.error("Failed to get selected text:", error);
      return "";
    }
  }

  async persist() {
    try {
      const tabs = this.getTabs();
      const index = this.tabController?.index || 0;
      const activeTabId = this.tabController?.activeTab?.id || null;
      const tabGroups = tabGroupController.getGroups();
      appDb.transaction(() => {
        appDb.run("DELETE FROM tabs");
        for (const tab of tabs || []) {
          appDb.run(
            'INSERT OR REPLACE INTO tabs (id, title, url, is_pinned, is_focused, "index", favicon, timestamp, is_bookmarked, is_hibernated, prevent_hibernate, group_id, audible, is_muted, is_using_camera, is_using_microphone, is_using_screen_share, blocked_notifications, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
              tab.id,
              tab.title,
              tab.url,
              tab.isPinned ? 1 : 0,
              tab.isFocused ? 1 : 0,
              tab.index ?? 0,
              tab.favicon || "",
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
            ],
          );
        }
        appDb.run("DELETE FROM app_state WHERE key IN ('tab_index', 'active_tab_id')");
        appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('tab_index', ?)", [JSON.stringify(index)]);
        appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES ('active_tab_id', ?)", [
          JSON.stringify(activeTabId),
        ]);
        appDb.run("DELETE FROM tab_groups");
        for (const group of tabGroups || []) {
          appDb.run(
            "INSERT OR REPLACE INTO tab_groups (id, name, color, hidden, collapsed, created_at, updated_at, tab_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
              group.id,
              group.name,
              group.color,
              group.hidden ? 1 : 0,
              group.collapsed ? 1 : 0,
              group.createdAt,
              group.updatedAt,
              JSON.stringify(group.tabIds),
            ],
          );
        }
      });
      await Promise.all([this.minusSession?.cookies.flushStore(), this.minusSession?.flushStorageData()]);
      return this.window.webContents?.send("SYNC");
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  openSpotlight(payload?: { query?: string }) {
    subWindowService.open("/spotlight", {
      query: payload?.query || this.tabController?.activeTab?.url || this.tabController?.activeTab?.title || "",
      activeTabId: this.tabController?.activeTab?.id,
    });
  }

  closeSpotlight() {
    subWindowService.close();
  }

  togglePinTab(data: { id: string }) {
    this.tabController?.togglePinTab(data.id);
    this.syncTabsToWindows();
  }

  togglePreventHibernate(data: { id: string }) {
    this.tabController?.togglePreventHibernate(data.id);
    this.syncTabsToWindows();
  }

  reorderTabs(data: { orderedIds: string[] }) {
    this.tabController?.reorderTabs(data.orderedIds);
    this.syncTabsToWindows();
  }

  handleOpenTabById(data: { id: string }) {
    if (!data?.id) return;
    const tab = this.tabController?.getTabById(data.id);
    if (tab?.isHibernated) tab.wake();
    this.forwardRendererEvent("OPEN_TAB_BY_ID", { id: data.id });
    this.tabController?.setActiveTab(data.id);
    this.syncTabsToWindows();
  }

  attachChildView(view: WebContentsView) {
    eventStore.broadcast("viewChanges", view);
    this.window.contentView.addChildView(view);
    if (subWindowService.isOpen) {
      subWindowService.ensureOnTop();
    }
    // Notification layer (zIndex=3) always on top of everything
    this.notificationService.ensureOnTop();
  }
  
  detachChildView(view: WebContentsView) {
    eventStore.broadcast("viewChanges", undefined);
    this.window.contentView.removeChildView(view);
  }

  async onCloseApp() {
    try {
      await this.persist();
    } catch (error) {
      log.error("Failed to persist before quit", error);
    } finally {
      app.quit();
    }
  }

  async interfaceSave(data: IUserInterface) {
    cacheSystem.set("interface", data);
    appDb.transaction(() => {
      appDb.run("DELETE FROM app_state WHERE key LIKE 'ui_%'");
      for (const [key, value] of Object.entries(data)) {
        appDb.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)", [`ui_${key}`, JSON.stringify(value)]);
      }
    });

    if (data.hibernateMode) {
      this.tabController?.setHibernateMode(data.hibernateMode, data.hibernateCustomMinutes);
    }

    if (data.notificationRetentionDays) {
      this.notificationService.setRetentionDays(Number(data.notificationRetentionDays));
    }

    const prev = this.userInterface?.extension;
    const next = data.extension;
    this.userInterface = data;

    if (prev && next) {
      adblocker.isCosmeticFilteringEnabled = next.cosmeticFiltering ?? true;

      const filtersChanged =
        JSON.stringify([...next.disabledFilters].sort()) !== JSON.stringify([...prev.disabledFilters].sort()) ||
        JSON.stringify(next.customFilters ?? []) !== JSON.stringify(prev.customFilters ?? []);

      if (next.adblock && !prev.adblock) {
        if (next.customFilters?.length) {
          await adblocker.setCustomFilters(next.customFilters);
        }
        await adblocker.initialize(next.disabledFilters);
        adblocker.enable();
        this.watchAllTabWebContents();
      } else if (!next.adblock && prev.adblock) {
        adblocker.disable();
      } else if (next.adblock && prev.adblock) {
        if (filtersChanged) {
          adblocker.disable();
          if (next.customFilters?.length) {
            await adblocker.setCustomFilters(next.customFilters);
          }
          await adblocker.initialize(next.disabledFilters);
          adblocker.enable();
          this.watchAllTabWebContents();
        }
      }

      if (
        next.adblockAutoUpdate !== prev.adblockAutoUpdate ||
        next.adblockAutoUpdateInterval !== prev.adblockAutoUpdateInterval
      ) {
        if (next.adblockAutoUpdate !== false) {
          const interval = (next.adblockAutoUpdateInterval ?? 360) * 60 * 1000;
          adblocker.startAutoUpdate(interval);
        } else {
          adblocker.stopAutoUpdate();
        }
      }
    }
  }

  showNotification({ title, description }: { title: string; description: string }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }
}
