import { app, BrowserWindow, dialog, ipcMain, Notification, session, WebContentsView } from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { ErrorServices } from "../services/error.services";
import { StoreManager } from "../stores";
import { AdBlocker } from "./adsBlockController";
import { TabCoordinator } from "./tabCoordinator";
import { isSameURl } from "../utils";

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
  /**
   * @deprecated
   * using tabManger instead
   */
  viewManager: Record<string, WebContentsView & { isOpenedDevTools?: boolean }> = {};
  /**
   * @deprecated
   */
  viewActive: string = "";

  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  sessionStore: StoreManager = new StoreManager("session");

  tabCoordinator = new TabCoordinator();

  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;
  private adBlocker: AdBlocker;

  constructor(window: BrowserWindow) {
    this.window = window;
    this.wc = window.webContents;
    this.initializeHandlers();
    this.init();
    this.adBlocker = new AdBlocker();
    window.webContents?.on("render-process-gone", function (event, detailed) {
      log.info("!crashed, reason: " + detailed.reason + ", exitCode = " + detailed.exitCode);
      if (detailed.reason == "crashed") {
        window.webContents?.reload();
      } else {
        app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
        app.exit(0);
      }
    });
  }

  private initializeHandlers() {
    this.invokeHandlers = {
      [TabEventType.GET_TABS]: () => this.getTabs(),
      [TabEventType.CREATE_TAB]: (tab?: Partial<ITab>) => this.createTab(tab),
      GET_USER_INTERFACE: () => this.loadUserInterface(),
      CLOUD_SAVE: () => this.cloudSave(),
      SEARCH_PAGE: (data) => this.handleSearchPage(data),
      INTERFACE_SAVE: (data) => this.interfaceSave(data),
    };

    this.listenerHandlers = {
      [ViewEventType.SHOW_VIEW_BY_ID]: (data) => this.handleShowViewById(data),
      [ViewEventType.VIEW_CHANGE_URL]: (data) => this.handleURLChange(data),
      [ViewEventType.VIEW_RESPONSIVE]: (data) => this.handleResizeView(data),
      [ViewEventType.HIDE_VIEW]: (data) => this.handleHideView(data),
      [TabEventType.ON_BACKWARD]: (data) => this.onGoBack(data),
      [TabEventType.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
      [TabEventType.TOGGLE_DEV_TOOLS]: (data) => this.handleToggleDevTools(data),
      [TabEventType.ON_RELOAD]: (data) => this.handleReloadTab(data),
      ["CLOSE_APP"]: () => this.onCloseApp(),
      REQUEST_PIP: (data) => this.requestPIP(data),
      [TabEventType.TOGGLE_BOOKMARK]: (data) => this.handleToggleBookmark(data),
    };
  }

  async init() {
    ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
    ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    this.adBlocker = new AdBlocker(); // async function
    this.window.webContents.send("GET_TABS", { tabs: this.tabCoordinator.getTabs });
  }

  async getTabs() {
    return this.tabCoordinator.getTabs;
  }

  private onInvoke(args: IPC) {
    const { channel, data } = args;
    log.info(`[IPC Invoke] channel: ${channel}`);
    const handler = this.invokeHandlers[channel];
    if (handler) {
      return handler(data);
    }
    log.warn(`No invoke handler for channel: ${channel}`);
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    log.info(`[IPC Listen] channel: ${channel}`);
    const handler = this.listenerHandlers[channel];
    if (handler) {
      handler(data);
    } else {
      log.warn(`No listener handler for channel: ${channel}`);
    }
  }

  createTab(tab?: Partial<ITab>) {
    return this.tabCoordinator.createTab(tab);
  }

  async handleShowViewById(props: IHandleResizeView) {
    if (!props?.tab?.id) throw new Error("Tab id not found");
    const tabMetadata = this.tabCoordinator.getActiveTab(props?.tab?.id);
    if (!tabMetadata) throw new Error("Tab not found");
    this.window.contentView.addChildView(tabMetadata.webContentsView.view);
    tabMetadata.webContentsView.view.setVisible(true);
    tabMetadata.webContentsView.view.setBounds(props.screen);
    const url1 = tabMetadata.tab.url;
    const url2 = tabMetadata.webContentsView.webContents.getURL();
    if (!isSameURl(url1, url2)) {
      tabMetadata.webContentsView.webContents.loadURL(tabMetadata.tab.url);
    }
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab;
      if (!id || !url) throw new Error("Tab id or url not found");
      const tabMetadata = this.tabCoordinator.getActiveTab(id);
      if (!tabMetadata) throw new Error("Tab not found");
      await this.loadSessionByURL({ url, view: tabMetadata.webContentsView.view });
      tabMetadata.webContentsView.webContents.loadURL(url);
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  async loadSessionByURL({ url, view }: { url: string; view: WebContentsView }) {
    const { origin } = new URL(url);
    if (!origin) return;
    const viewCookie = await session.defaultSession.cookies.get({ url: origin });
    console.log(`loadSessionByURL ${origin}`, viewCookie);
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
    const tabMetadata = this.tabCoordinator.getActiveTab(tab.id);
    if (!tabMetadata) return;
    tabMetadata.webContentsView.view.setBounds(screen);
  }

  handleHideView(props: { id: string }) {
    try {
      if (!props || !props.id) return;
      this.tabCoordinator.hideView({ id: props.id, window: this.window });
    } catch (error) {
      return new ErrorServices(error);
    }
  }

  onGoBack(props: { data: ITab }) {
    if (!props?.data?.id) return;
    const tabMetadata = this.tabCoordinator.getActiveTab(props?.data?.id);
    if (!tabMetadata) return;
    if (tabMetadata.webContentsView?.webContents?.navigationHistory.canGoBack()) {
      tabMetadata.webContentsView?.webContents?.navigationHistory.goBack();
    }
  }

  async onCloseTab(props: { id: string }) {
    this.tabCoordinator.closeTab({ id: props.id, window: this.window });
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const tabMetadata = this.tabCoordinator.getActiveTab(props?.id);
    if (!tabMetadata) return;
    const view = tabMetadata.webContentsView?.view;
    if (!view) return;
    let isOpenedDevTools = view.webContents?.isDevToolsOpened();
    view.webContents?.toggleDevTools();
    if (isOpenedDevTools) {
      view.webContents?.closeDevTools();
    } else {
      view.webContents?.openDevTools();
    }
  }

  async handleReloadTab(props: ITab) {
    try {
      if (!props.id) throw new Error("Tab id not found");
      const tabMetadata = this.tabCoordinator.getActiveTab(props.id);
      if (!tabMetadata) throw new Error("Tab not found");
      tabMetadata.webContentsView.webContents.reload();
    } catch (e) {
      new ErrorServices(e);
    }
  }

  // async getPIPState() {
  //   const obj: Record<string, boolean> = {};
  //   for (let id in this.viewManager) {
  //     obj[id] = this.viewManager[id].webContents?.isCurrentlyAudible();
  //   }
  //   return obj;
  // }

  async requestPIP({ tab }: { tab: ITab }) {
    if (!tab?.id) {
      return new Notification({
        title: "Error",
        body: "Tab id not found",
      }).show();
    }
    const tabMetadata = this.tabCoordinator.getActiveTab(tab.id);

    if (!tabMetadata) {
      return new Notification({
        title: "Error",
        body: "Tab not found",
      }).show();
    }

    if (!tabMetadata.webContentsView) return;
    if (!tabMetadata.webContentsView.webContents?.isFocused()) {
      tabMetadata.webContentsView.webContents?.focus();
    }
    tabMetadata.webContentsView.webContents
      .executeJavaScript(`(${preloadScript.toString()})()`)
      .then(() => {
        log.info("requestPIP success");
      })
      .catch((error) => {
        log.info("requestPIP error", error);
      });
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
    this.tabCoordinator.bookmark({ url, id });
  }

  async loadUserInterface() {
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
    const viewCookie = await session.defaultSession.cookies.get({ url: origin });
    return viewCookie;
  }
  async cloudSave() {
    try {
      log.info("cloudSave tabManager data");
      const tabs = this.tabCoordinator.getTabs;
      const cookies = session.defaultSession.cookies;
      for (let i = 0; i < tabs.length; i++) {
        tabs[i].cookies = await this.getCookieFromURL(tabs[i].url);
      }
      await Promise.all([cookies.flushStore(), this.userStore.saveFiles({ tabs: tabs || [], index: 0 })]);
      return this.window.webContents?.send("SYNC");
    } catch (error) {
      const noti = new Notification({
        title: "Error",
        body: error.message,
      });
      noti.show();
    }
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
          message: "Hardware acceleration is disabled. This may cause some issues. Do you want to continue? ",
          buttons: ["Yes", "No"],
        })
        .then((res) => {
          if (res.response === 0) {
            process.env.ELECTRON_DISABLE_GPU = "true";
            app.relaunch({ args: process.argv.slice(1).concat(["--relaunch --disable-gpu"]) });
            app.exit(0);
          } else {
            process.env.ELECTRON_DISABLE_GPU = "";
          }
        });
    }
  }

  clearCache({ tab }: { tab: ITab }) {
    return this.tabCoordinator.clearCache({ id: tab.id });
  }
  clearAllCache() {
    return this.tabCoordinator.clearAllCache();
  }

  showNotification({ title, description }: { title: string; description: string }) {
    return new Notification({
      title: title,
      body: description,
    }).show();
  }
}

const preloadScript = () => {
  // @ts-ignore
  function enterPictureInPicture(videoElement) {
    if (document.pictureInPictureEnabled && !videoElement.disablePictureInPicture) {
      try {
        if (document.pictureInPictureElement) {
          document.exitPictureInPicture();
        }
        videoElement
          .requestPictureInPicture()
          .then(() => {
            console.log("Entered Picture-in-Picture mode.");
          })
          // @ts-ignore
          .catch((error) => {
            console.error("Failed to enter Picture-in-Picture mode:", error);
          });
      } catch (err) {
        console.error(err);
      }
    }
  }
  setTimeout(() => {
    enterPictureInPicture(document.querySelector("video"));
  }, 500);
};
