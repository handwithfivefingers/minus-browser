import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Notification,
  session,
  WebContentsView,
} from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { ErrorServices } from "../services/error.services";
import { StoreManager } from "../stores";
import { isSameURl } from "../utils";
import { TabController } from "./tab";

enum TabEventType {
  CREATE_TAB = "CREATE_TAB",
  UPDATE_TAB = "UPDATE_TAB",
  DELETE_TAB = "DELETE_TAB",
  SELECT_TAB = "SELECT_TAB",
  FOCUS_TAB = "FOCUS_TAB",
  BLUR_TAB = "BLUR_TAB",
  ON_BACKWARD = "ON_BACKWARD",
  FORWARD_TAB = "FORWARD_TAB",
  GET_TABS = "GET_TABS",
  GET_TAB = "GET_TAB",
  TOGGLE_DEV_TOOLS = "TOGGLE_DEV_TOOLS",
  ON_RELOAD = "ON_RELOAD",
  ON_CLOSE_TAB = "ON_CLOSE_TAB",
  TOGGLE_BOOKMARK = "TOGGLE_BOOKMARK",
}

enum ViewEventType {
  SHOW_VIEW_BY_ID = "SHOW_VIEW_BY_ID",
  VIEW_RESPONSIVE = "VIEW_RESPONSIVE",
  SHOW_VIEW = "SHOW_VIEW",
  HIDE_VIEW = "HIDE_VIEW",
  UPDATE_VIEW_SIZE = "UPDATE_VIEW_SIZE",
  VIEW_CHANGE_URL = "VIEW_CHANGE_URL",
}
interface IUserInterface {
  layout: string;
  mode: string;
  dataSync: {
    intervalTime: string;
    hardwareAcceleration: string;
  };
}
export class ViewController {
  window: BrowserWindow;
  wc: Electron.WebContents;
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  sessionStore: StoreManager = new StoreManager("session");
  tabController = new TabController();

  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.initializeHandlers();
    this.init();
    this.window.webContents?.on(
      "render-process-gone",
      function (event, detailed) {
        log.info(
          "!crashed, reason: " +
            detailed.reason +
            ", exitCode = " +
            detailed.exitCode,
        );
        if (detailed.reason == "crashed") {
          window.webContents?.reload();
        } else {
          app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
          app.exit(0);
        }
      },
    );
  }

  private async initializeHandlers() {
    try {
      this.invokeHandlers = {
        [TabEventType.GET_TABS]: () => this.getTabs(),
        [TabEventType.CREATE_TAB]: (tab?: Partial<ITab>) => this.createTab(tab),
        ["GET_TAB"]: (tab?: Partial<ITab>) => this.getTab({ id: tab.id }),
        GET_USER_INTERFACE: () => this.loadUserInterface(),
        CLOUD_SAVE: () => this.cloudSave(),
        SEARCH_PAGE: (data) => this.handleSearchPage(data),
        INTERFACE_SAVE: (data) => this.interfaceSave(data),
      };

      this.listenerHandlers = {
        [ViewEventType.SHOW_VIEW_BY_ID]: (data) =>
          this.handleShowViewById(data),
        [ViewEventType.VIEW_CHANGE_URL]: (data) => this.handleURLChange(data),
        [ViewEventType.VIEW_RESPONSIVE]: (data) => this.handleResizeView(data),
        [ViewEventType.HIDE_VIEW]: (data) => this.handleHideView(data),
        [TabEventType.ON_BACKWARD]: (data) => this.onGoBack(data),
        [TabEventType.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
        [TabEventType.TOGGLE_DEV_TOOLS]: (data) =>
          this.handleToggleDevTools(data),
        [TabEventType.ON_RELOAD]: (data) => this.handleReloadTab(data),
        ["CLOSE_APP"]: () => this.onCloseApp(),
        REQUEST_PIP: (data) => this.requestPIP(data),
        [TabEventType.TOGGLE_BOOKMARK]: (data) =>
          this.handleToggleBookmark(data),
      };
      console.log("initializeHandlers Completed");
    } catch (err) {
      console.log("initializeHandlers Error");
    }
  }

  async init() {
    try {
      await this.tabController.initialize();
      ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
      ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    } catch (error) {
      console.log("[ERROR] View Controller -", error);
    }
  }
  getTabs() {
    const response = this.tabController.getTabs();
    return response;
  }
  async getTab({ id }: { id: string }) {
    const tab = this.tabController.getTabById(id);
    return tab.toJSON();
  }

  private onInvoke(args: IPC) {
    try {
      const { channel, data } = args;
      log.info(`[IPC Invoke] channel: ${channel}`);
      const handler = this.invokeHandlers[channel];
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
    // log.info(`[IPC Listen] channel: ${channel}`);
    const handler = this.listenerHandlers[channel];
    if (handler) {
      handler(data);
    } else {
      log.warn(`No listener handler for channel: ${channel}`);
    }
  }

  createTab(tab?: Partial<ITab>) {
    const newTab = this.tabController.addNewTab(tab);
    this.window.webContents.send("GET_TABS", this.getTabs());
    return newTab;
  }

  async handleShowViewById(props: IHandleResizeView) {
    try {
      if (!props?.tab.id) throw new Error("Tab id not found");
      const currentTab = this.tabController.getTabById(props.tab?.id);
      this.attachChildView(currentTab.view);
      // currentTab.view.webContents.loadURL(currentTab.url);
      const url1 = currentTab.url;
      const url2 = currentTab.webContents.getURL();
      if (!isSameURl(url1, url2)) {
        currentTab.webContents.loadURL(currentTab.url);
      }
      currentTab.show();
      currentTab.view.setBounds(props.screen);
      this.tabController.setActiveTab(currentTab.id);
      // currentTab.registerTabEvents();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab;
      if (!id || !url) throw new Error("Tab id or url not found");
      const currentTab = this.tabController.getTabById(id);
      if (!currentTab) throw new Error("Tab not found");
      await this.loadSessionByURL({
        url,
        view: currentTab.view,
      });
      currentTab.webContents.loadURL(url);
      currentTab.updateUrl(url);
      this.window.webContents.send("GET_TABS", this.getTabs());
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  async loadSessionByURL({
    url,
    view,
  }: {
    url: string;
    view: WebContentsView;
  }) {
    const { origin } = new URL(url);
    if (!origin) return;
    const viewCookie = await session.defaultSession.cookies.get({
      url: origin,
    });
    if (viewCookie.length) {
      viewCookie?.forEach((item) => {
        view.webContents?.session.cookies.set({
          url: origin,
          name: item.name,
          domain: item.domain,
          value: item.value,
          path: item.path,
          httpOnly: item.httpOnly,
          secure: item.secure,
          expirationDate: item.expirationDate,
          sameSite: item.sameSite,
        });
      });
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    const currentTab = this.tabController.getTabById(tab.id);
    if (!currentTab) return;
    currentTab.view.setBounds(screen);
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return;
      const currentTab = this.tabController.getTabById(props.id);
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
      const currentTab = this.tabController.getTabById(props?.data?.id);
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
      const currentTab = this.tabController.getTabById(props.id);
      currentTab.hide();
      this.detachChildView(currentTab.view);
      const { nextTab } = this.tabController.closeTab(props.id);
      this.attachChildView(nextTab.view);
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const currentTab = this.tabController.getTabById(props?.id);
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
      let id = tab?.id || this.tabController.activeTab?.id;
      if (!id) throw new Error("Tab not found");
      const currentTab = this.tabController.getTabById(id);
      return currentTab?.onReload();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  async requestPIP({ tab }: { tab: ITab }) {
    try {
      if (!tab?.id) throw new Error(`Tab id not found`);
      const currentTab = this.tabController.getTabById(tab.id);
      return currentTab.onRequestPIP();
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  handleSearchPage(v: any) {
    // const view = this.viewManager[this.viewActive];
    // log.info("handleSearchPage", view);
    // if (!view) return;
    // log.info("handleSearchPage clearSelection");
    // view.webContents?.on("found-in-page", (event, result) => {
    //   console.log("found-in-page");
    //   if (result.finalUpdate) view.webContents?.stopFindInPage("clearSelection");
    // });
    // view.webContents?.findInPage(v.data, {
    //   forward: false,
    //   findNext: true,
    //   matchCase: true,
    // });
  }
  handleToggleBookmark({ url, id }: { url: string; id: string }) {
    this.tabController.addNewBookmark({ url, id });
  }

  async loadUserInterface() {
    console.log("loading User Interface");
    const userInterface = await this.interfaceStore.readFiles();
    const defaultData: IUserInterface = {
      layout: "default",
      mode: "default",
      dataSync: {
        intervalTime: "15",
        hardwareAcceleration: "1",
      },
    };
    Object.assign(defaultData, userInterface);
    return userInterface;
  }

  async getCookieFromURL(url: string) {
    const { origin } = new URL(url);
    if (!origin) return;
    const viewCookie = await session.defaultSession.cookies.get({
      url: origin,
    });
    return viewCookie;
  }
  async cloudSave() {
    try {
      const tabs = this.getTabs();
      const cookies = session.defaultSession.cookies;
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].cookies = await this.getCookieFromURL(tabs[i].url);
      }
      await Promise.all([
        cookies.flushStore(),
        this.userStore.saveFiles({ tabs: tabs || [], index: 0 }),
      ]);
      return this.window.webContents?.send("SYNC");
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  attachChildView(view: WebContentsView) {
    this.window.contentView.addChildView(view);
  }
  detachChildView(view: WebContentsView) {
    this.window.contentView.removeChildView(view);
  }

  onCloseApp() {
    app.quit();
  }

  interfaceSave(data: IUserInterface) {
    this.interfaceStore.saveFiles(data);
    if (data.dataSync.hardwareAcceleration === "0") {
      dialog
        .showMessageBox({
          title: "Warning",
          message:
            "Hardware acceleration is disabled. This may cause some issues. Do you want to continue? ",
          buttons: ["Yes", "No"],
        })
        .then((res) => {
          if (res.response === 0) {
            process.env.ELECTRON_DISABLE_GPU = "true";
            app.relaunch({
              args: process.argv.slice(1).concat(["--relaunch --disable-gpu"]),
            });
            app.exit(0);
          } else {
            process.env.ELECTRON_DISABLE_GPU = "";
          }
        });
    }
  }

  clearCache({ tab }: { tab: ITab }) {
    return this.tabController.getTabById(tab.id)?.clearCache();
  }
  clearAllCache() {
    const tabs = this.getTabs();
    tabs.forEach((tab) => this.tabController.getTabById(tab.id)?.clearCache());
  }

  showNotification({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }
}
