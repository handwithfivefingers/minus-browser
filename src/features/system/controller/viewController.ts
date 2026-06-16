import { app, BrowserWindow, ipcMain, Notification, WebContentsView } from "electron";
import log from "electron-log";
import { cacheSystem } from "~/features/cacheSystem";
import { SearchRoute, searchController as splitSearchController } from "~/features/search";
import { TabController } from "~/features/tabs/controllers";
import { Tab } from "~/features/tabs/models/tab";
import { TranslateRoute } from "~/features/translate/route-init";
import { UserScriptRoute } from "~/features/userscript/route-init";
import { VaultRoute } from "~/features/vault/route-init";
import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { IUserInterface } from "~/shared/types";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { ErrorServices } from "../services/error.services";
import { SpotlightRoute, spotlightController } from "~/features/spotlight";
import { minusSessionManager } from "../services/session";
import { StoreManager } from "../stores";
import { eventStore } from "../stores/minusEventEmitter";
import { isSameURl } from "../utils";

export type EmitToRenderer = (channel: string, data?: unknown) => void;
export class ViewController {
  window: BrowserWindow;
  wc: Electron.WebContents | undefined;
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  minusSession: Electron.Session | undefined = minusSessionManager.session;
  userInterface: IUserInterface | undefined = undefined;
  tabController: TabController | undefined;
  spotlightController = spotlightController;
  searchController = splitSearchController;
  private invokeHandlers: Record<string, (data?: any) => any> | undefined;
  private listenerHandlers: Record<string, (data?: any) => void> | undefined;

  constructor(window: BrowserWindow) {
    this.tabController = new TabController((payload) => this.onInvoke(payload));
    this.window = window;
    this.init();
  }

  handleClickNotification(notification: Electron.ActivationArguments) {
    console.log("notification", notification);
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
        ...VaultRoute,
        ...TranslateRoute,
        ...UserScriptRoute,
        ...SearchRoute,
        ...SpotlightRoute,
        // [IPC_INVOKE_CHANNEL.SEARCH_PAGE]: (data) => this.searchController?.searchPage(data),
        // [IPC_INVOKE_CHANNEL.GET_USERSCRIPTS]: () => this.getUserScripts(),
        // [IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT]: (data) => this.saveUserScript(data),
        // [IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT]: () => this.importUserScript(),
        // [IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT]: (data) => this.deleteUserScript(data),
        // [IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT]: (data) => this.toggleUserScript(data),
        // [IPC_INVOKE_CHANNEL.VAULT_LIST]: () => this.vaultController.getVaults(),
        // [IPC_INVOKE_CHANNEL.VAULT_ADD]: (data) => this.vaultController.addVault(data),
        // [IPC_INVOKE_CHANNEL.VAULT_UPDATE]: (data: VaultUpdateParams) =>
        //   this.vaultController.updateVault(data.id, data.patch || {}),

        // [IPC_INVOKE_CHANNEL.VAULT_DELETE]: (data: { id: string }) => this.vaultController.removeVault(data.id),
        // [IPC_INVOKE_CHANNEL.VAULT_FILL]: (data) => this.vaultFill(data),
        // [IPC_INVOKE_CHANNEL.VAULT_SELECT_CREDENTIAL]: (data) => this.vaultSelectCredential(data),
        // [IPC_INVOKE_CHANNEL.VAULT_CONFIRM_SAVE]: (data) => this.vaultConfirmSave(data),
        // [IPC_INVOKE_CHANNEL.VAULT_OPEN_MANAGER]: (data) => this.vaultOpenManager(data),
        // [IPC_INVOKE_CHANNEL.USERSCRIPT_OPEN_MANAGER]: (data) => this.userscriptOpenManager(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_GET_PREFERENCE]: () => this.translateGetPreference(),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE]: (data) => this.translateSavePreference(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_DETECT_LANGUAGE]: (data) => this.translateDetectLanguage(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_PAGE]: (data) => this.translatePage(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_SELECTION]: (data) => this.translateSelection(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_OPEN_MANAGER]: (data) => this.translateOpenManager(data),
        // [IPC_INVOKE_CHANNEL.TRANSLATE_GET_SELECTION_HISTORY]: () => this.translateGetSelectionHistory(),
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
        [IPC_EMIT_CHANNEL.SPOTLIGHT_OPEN]: (data) => this.openSpotlight(data),
        [IPC_EMIT_CHANNEL.SPOTLIGHT_CLOSE]: () => this.closeSpotlight(),
        [IPC_EMIT_CHANNEL.OPEN_TAB_BY_ID]: (data) => this.handleOpenTabById(data),
      };
      console.log("initializeHandlers Completed");
    } catch (err) {
      console.log("initializeHandlers Error");
    }
  }

  private forwardRendererEvent(channel: string, data?: unknown) {
    this.window.webContents.send(channel, data);
  }

  private syncTabsToWindows() {
    const tabs = this.getTabs() || [];
    this.window.webContents.send("GET_TABS", tabs);
    this.spotlightController.syncTabs(tabs);
  }

  async init() {
    try {
      // await this.initializeHandlers();
      await minusSessionManager.load();
      await Promise.all([this.initializeHandlers(), this.tabController?.initialize()]);
      minusSessionManager.watch();
      ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
      ipcMain.on("send", (event, args: IPC) => this.onListener(args));

      Notification.getHistory()
        .then((r) => {
          console.log("r", r);
        })
        .catch((e) => {
          console.log("Notification error", e);
        });
    } catch (error) {
      console.log("[ERROR] View Controller -", error);
    } finally {
      this.syncTabsToWindows();
      spotlightController.warmup().catch(() => {});
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
      log.info(`[IPC Invoke] channel: ${channel}`);
      const handler = this.invokeHandlers?.[channel];
      if (handler) {
        return handler(data);
      }
      log.warn(`No invoke handler for channel: ${channel}`);
    } catch (error) {
      console.log("[ERRROR] INVOKE :", error);
    }
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    log.info(`[IPC Listen] channel: ${channel}`);
    const handler = this.listenerHandlers?.[channel];
    if (handler) {
      handler(data);
    } else {
      log.warn(`No listener handler for channel: ${channel}`);
    }
  }

  async createTab(tab?: Partial<ITab>) {
    const newTab = await this.tabController?.addNewTab(tab);
    this.syncTabsToWindows();
    if (newTab?.id) {
      this.forwardRendererEvent("OPEN_TAB_BY_ID", { id: newTab.id });
    }
    return newTab;
  }

  async handleShowViewById(props: IHandleResizeView) {
    try {
      if (!props?.tab.id) throw new Error("Tab id not found");
      const currentTab = this.tabController?.getTabById(props.tab?.id) as Tab;
      this.attachChildView(currentTab.view);
      const url1 = currentTab.url;
      const url2 = currentTab.webContents.getURL();
      if (!isSameURl(url1, url2)) {
        currentTab.webContents.loadURL(currentTab.url);
      }
      currentTab.show();
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
      // await this.loadSessionByURL({
      //   url,
      //   view: currentTab.view,
      // });
      // currentTab.cookies = await this.getCookieFromURL(url);
      currentTab.webContents.loadURL(url);
      currentTab.updateUrl(url);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    const currentTab = this.tabController?.getTabById(tab?.id as string);
    if (!currentTab) return;
    currentTab.view.setBounds(screen);
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return;
      const currentTab = this.tabController?.getTabById(props.id);
      if (!currentTab) return;
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
      currentTab.hide();
      currentTab.view.webContents.close();
      this.detachChildView(currentTab.view);
      const { nextTab } = this.tabController?.closeTab(props.id) || {};
      if (nextTab?.view) this.attachChildView(nextTab?.view);
      this.syncTabsToWindows();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const currentTab = this.tabController?.getTabById(props?.id);
    if (!currentTab) return;
    const view = currentTab.view;
    if (!view) return;
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

  handleToggleBookmark({ url, id }: { url: string; id: string }) {
    /**
     * @Todo
     */
    // this.tabController?.addNewBookmark({ url, id });
  }

  async loadUserInterface() {
    const defaultData: IUserInterface = {
      layout: "default",
      mode: "default",
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
      },
    };
    try {
      const userInterface = await cacheSystem.get<IUserInterface>("interface", () =>
        this.interfaceStore.readFiles<IUserInterface>(),
      );
      Object.assign(defaultData, userInterface);
      this.userInterface = userInterface;
      return userInterface;
    } catch (error) {
      return defaultData;
    }
  }

  // async getCookieFromURL(url: string) {
  //   const { origin } = new URL(url);
  //   if (!origin) return;
  //   if (this.userInterface?.savedCookies === "0") {
  //     const viewCookie = await this.minusSession?.cookies.get({
  //       url: origin,
  //     });
  //     return viewCookie;
  //   } else {
  //     const viewCookie = this.sessions?.filter(
  //       (cookie) => cookie.domain?.includes(url) || (cookie?.domain && url.includes(cookie?.domain)),
  //     );
  //     return viewCookie;
  //   }
  // }

  // sessionPersist({ cookie, removed }: { cookie: Electron.Cookie; removed: boolean }) {
  //   // this.sessions
  //   if (removed) {
  //     let index = this.sessions?.findIndex(
  //       (c) => c.name === cookie.name && c.domain === cookie.domain && c.path === cookie.path,
  //     );
  //     if (index !== undefined && index > -1) {
  //       this.sessions?.splice(index, 1);
  //     }
  //   } else {
  //     this.sessions?.push(cookie);
  //   }

  //   const nextSession = this.sessions.filter(
  //     (cookie) => cookie?.expirationDate && cookie.expirationDate * 1000 > Date.now(),
  //   );
  //   this.sessions = nextSession;

  //   this.sessionPersistDebounce();
  // }

  async persist() {
    try {
      const tabs = this.getTabs();
      await Promise.all([
        minusSessionManager.save(),
        this.minusSession?.cookies.flushStore(),
        this.minusSession?.flushStorageData(),
        this.userStore.saveFiles({ tabs: tabs || [], index: 0 }),
      ]);
      return this.window.webContents?.send("SYNC");
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  openSpotlight(payload?: { query?: string }) {
    spotlightController.open({
      query: payload?.query || this.tabController?.activeTab?.url || this.tabController?.activeTab?.title || "",
      tabs: this.getTabs() || [],
    });
  }

  closeSpotlight() {
    spotlightController.close();
  }

  handleOpenTabById(data: { id: string }) {
    if (!data?.id) return;
    this.forwardRendererEvent("OPEN_TAB_BY_ID", { id: data.id });
    this.tabController?.setActiveTab(data.id);
    this.syncTabsToWindows();
  }

  attachChildView(view: WebContentsView) {
    eventStore.broadcast("viewChanges", view);
    this.window.contentView.addChildView(view);
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

    // if (data.dataSync.hardwareAcceleration === "0") {
    //   dialog
    //     .showMessageBox({
    //       title: "Warning",
    //       message: "Hardware acceleration is disabled. This may cause some issues. Do you want to continue? ",
    //       buttons: ["Yes", "No"],
    //     })
    //     .then((res) => {
    //       if (res.response === 0) {
    //         process.env.ELECTRON_DISABLE_GPU = "true";
    //         app.relaunch({
    //           args: process.argv.slice(1).concat(["--relaunch --disable-gpu"]),
    //         });
    //         app.exit(0);
    //       } else {
    //         process.env.ELECTRON_DISABLE_GPU = "";
    //       }
    //     });
    // }
  }

  // clearCache({ tab }: { tab: ITab }) {
  //   return this.tabController?.getTabById(tab?.id as string)?.clearCache();
  // }

  // clearAllCache() {
  //   const tabs = this.getTabs();
  //   tabs.forEach((tab) => this.tabController?.getTabById(tab.id)?.clearCache());
  // }

  showNotification({ title, description }: { title: string; description: string }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }

  // async importUserScript() {
  //   const result = await dialog.showOpenDialog(this.window, {
  //     properties: ["openFile"],
  //     filters: [
  //       { name: "UserScript", extensions: ["user.js", "js"] },
  //       { name: "All Files", extensions: ["*"] },
  //     ],
  //   });
  //   if (result.canceled || !result.filePaths?.length) return null;
  //   const imported = await this.userScriptManagerController.importUserScript(result.filePaths[0]);
  //   return imported;
  // }
}
