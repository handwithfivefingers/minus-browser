import { app, BrowserWindow, ipcMain, Notification, WebContentsView } from "electron";
import log from "electron-log";
import { adblocker } from "~/features/adblocker/plugin";
import { cacheSystem } from "~/features/cacheSystem";
import { SearchRoute, searchController as splitSearchController } from "~/features/search";
import { TabController } from "~/features/tabs/controllers";
import { Tab } from "~/features/tabs/models/tab";
import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from "~/shared/constants/ipc";
import { IUserInterface } from "~/shared/types";
import { IHandleResizeView, IPC, ITab } from "~/core/interfaces";
import { ErrorServices } from "~/core/services/error.services";
import { HistoryRoute, historyController } from "~/core/controller/history";
import { browserSession } from "~/core/services/session";
import { StoreManager } from "~/core/stores";
import { eventStore } from "~/core/stores";
import { isSameURl } from "~/core/utils";
import { initAutoUpdate, checkForUpdates, quitAndInstall } from "~/features/autoUpdate/autoUpdate.init";
import { tabGroupController } from "~/features/tabGroup";
import { subWindowService } from "~/features/sub-window/service";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import {
  vaultInvokeHandlers,
  translateInvokeHandlers,
  userScriptInvokeHandlers,
  spotlightInvokeHandlers,
  spotlightEmitHandlers,
  tabGroupInvokeHandlers,
  tabGroupEmitHandlers,
} from "~/features/sub-window/ipc";
import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_RENDERER_EVENT } from "~/shared/constants/ipc/tabGroup";

export type EmitToRenderer = (channel: string, data?: unknown) => void;
export class ViewController {
  window: BrowserWindow;
  wc: Electron.WebContents | undefined;
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  minusSession: Electron.Session | undefined = browserSession;
  userInterface: IUserInterface | undefined = undefined;
  tabController: TabController | undefined;
  searchController = splitSearchController;
  private invokeHandlers: Record<string, (data?: any) => any> | undefined;
  private listenerHandlers: Record<string, (data?: any) => void> | undefined;
  private initPromise: Promise<void>;

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
        ...spotlightInvokeHandlers,
        ...tabGroupInvokeHandlers,
        "@adb/get-filter-metadata": () => adblocker.getFilterMetadata(),
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
        // [IPC_TAB_GROUP_INVOKE.ADD_TAB_TO_GROUP]: async (data: { groupId: string; tabId: string }) => {
        //   await tabGroupController.addTabToGroup(data.groupId, data.tabId);
        //   this.tabController?.updateTab(data.tabId, { groupId: data.groupId });
        //   return { success: true };
        // },
        // [IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP]: async (data: { groupId: string; tabId: string }) => {
        //   await tabGroupController.removeTabFromGroup(data.groupId, data.tabId);
        //   this.tabController?.updateTab(data.tabId, { groupId: undefined });
        //   return { success: true };
        // },
        // [IPC_TAB_GROUP_INVOKE.OPEN_GROUP_TAB]: (data: { id: string }) => {
        //   this.handleOpenTabById(data);
        //   return { success: true };
        // },
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
      };
    } catch (err) {
      console.error("initializeHandlers Error");
    }
  }

  private forwardRendererEvent(channel: string, data?: unknown) {
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
      ]);
      tabGroupController.onChanged = () => this.syncTabsToWindows();
      ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
      ipcMain.on("send", (event, args: IPC) => this.onListener(args));

      await this.loadUserInterface();
      this.tabController?.setUserInterface(this.userInterface!);
      await adblocker.initializeForSession(browserSession, this.userInterface?.extension?.disabledFilters);
      if (this.userInterface?.extension?.adblock) {
        adblocker.isCosmeticFilteringEnabled = this.userInterface?.extension?.cosmeticFiltering ?? true;
        adblocker.enable();
        this.watchAllTabWebContents();
      } else {
        adblocker.disable();
      }

      Notification.getHistory().catch((e) => {
        console.error("Notification error", e);
      });
    } catch (error) {
      console.error("[ERROR] View Controller -", error);
    } finally {
      initAutoUpdate((channel, data) => this.forwardRendererEvent(channel, data), {
        autoDownload: this.userInterface?.autoDownload,
      });
      subWindowService.init(this.window);
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
      dataSync: {
        intervalTime: "15",
        hardwareAcceleration: "1",
      },
      savedCookies: "0",
      extension: {
        adblock: true,
        vault: true,
        translate: true,
        userscript: true,
        cosmeticFiltering: true,
        disabledFilters: [],
      },
      hibernateMode: "normal",
      hibernateCustomMinutes: 60,
      autoDownload: true,
    };
    try {
      const userInterface = await cacheSystem.get<IUserInterface>("interface", () =>
        this.interfaceStore.readFiles<IUserInterface>(),
      );
      const merged = { ...defaultData, ...userInterface };
      this.userInterface = merged;
      if (merged.historyRetentionDays) {
        historyController.setRetentionDays(Number(merged.historyRetentionDays));
      }
      if (merged.hibernateMode) {
        this.tabController?.setHibernateMode(merged.hibernateMode, merged.hibernateCustomMinutes);
      }
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
      await Promise.all([
        this.minusSession?.cookies.flushStore(),
        this.minusSession?.flushStorageData(),
        this.userStore.saveFiles({ tabs: tabs || [], index, activeTabId, tabGroups }),
      ]);
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

  interfaceSave(data: IUserInterface) {
    cacheSystem.set("interface", data);
    this.interfaceStore.saveFiles(data);

    if (data.hibernateMode) {
      this.tabController?.setHibernateMode(data.hibernateMode, data.hibernateCustomMinutes);
    }

    const prev = this.userInterface?.extension;
    const next = data.extension;
    this.userInterface = data;

    if (prev && next) {
      adblocker.isCosmeticFilteringEnabled = next.cosmeticFiltering ?? true;

      if (next.adblock && !prev.adblock) {
        const filtersChanged =
          JSON.stringify([...next.disabledFilters].sort()) !== JSON.stringify([...prev.disabledFilters].sort());
        if (filtersChanged) {
          adblocker.initialize(next.disabledFilters).then(() => {
            adblocker.enable();
            this.watchAllTabWebContents();
          });
        } else {
          adblocker.enable();
          this.watchAllTabWebContents();
        }
      } else if (!next.adblock && prev.adblock) {
        adblocker.disable();
      } else if (next.adblock && prev.adblock) {
        const filtersChanged =
          JSON.stringify([...next.disabledFilters].sort()) !== JSON.stringify([...prev.disabledFilters].sort());
        if (filtersChanged) {
          adblocker.disable();
          adblocker.initialize(next.disabledFilters).then(() => {
            adblocker.enable();
            this.watchAllTabWebContents();
          });
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
