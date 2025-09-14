import { app, BrowserWindow, dialog, ipcMain, Notification, session, WebContentsView } from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab } from "../interfaces";
import { StoreManager } from "../stores";
import { AdBlocker } from "./adsBlockController";
import { WebContentsViewController } from "./webContentsViewController";

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
  viewManager: Record<string, WebContentsView & { isOpenedDevTools?: boolean }> = {};
  viewActive: string = "";
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;
  private adBlocker: AdBlocker;
  constructor(window: BrowserWindow) {
    this.window = window;
    this.wc = window.webContents;

    this.initializeHandlers();
    this.init();
    this.adBlocker = new AdBlocker();
    window.webContents.on("render-process-gone", function (event, detailed) {
      log.info("!crashed, reason: " + detailed.reason + ", exitCode = " + detailed.exitCode);
      if (detailed.reason == "crashed") {
        window.webContents.reload();
      } else {
        app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
        app.exit(0);
      }
    });
  }
  async getTabs() {
    const data = await this.userStore.readFiles();
    const sampleData: { tabs: ITab[]; index: number } = {
      index: 0,
      tabs: [],
    };
    const res = Object.assign(sampleData, data);
    return res;
  }

  private initializeHandlers() {
    this.invokeHandlers = {
      [TabEventType.GET_TABS]: () => this.getTabs(),
      GET_USER_INTERFACE: () => this.loadUserInterface(),
      CLOUD_SAVE: (data) => this.cloudSave(data),
      GET_PIP: () => this.getPIPState(),
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
      // REQUEST_PIP: (data) => this.requestPIP(data),
    };
  }

  async init() {
    ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
    ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    this.adBlocker = new AdBlocker(); // async function
  }

  onCloseApp() {
    if (Object.keys(this.viewManager).length) {
      for (let key in this.viewManager) {
        this.viewManager[key].webContents.session.flushStorageData();
      }
    }
    app.quit();
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

  destroy() {
    this.viewActive = "";
    for (let key in this.viewManager) {
      this.viewManager[key].webContents.session.flushStorageData();
    }
    this.viewManager = {};
    this.window = null as unknown as BrowserWindow;
  }

  async handleShowViewById(props: IHandleResizeView) {
    const { tab } = props;
    if (!tab.id) throw new Error("Tab id not found");
    const isViewExist = this.viewManager[tab.id];
    try {
      if (!isViewExist) {
        const { view } = new WebContentsViewController({
          tabId: tab.id,
          blocker: this.adBlocker,
        });
        this.viewManager[tab.id] = view;
        this.loadContentView(tab.id);
        await view.webContents.loadURL(tab.url);
      } else {
        if (isViewExist.isOpenedDevTools) {
          isViewExist.webContents.openDevTools();
        }
        this.loadContentView(tab.id);
      }
      if (!this.window.contentView.getVisible()) this.window.contentView.setVisible(true);

      this.handleResizeView(props);

      if (Object.keys(this.viewManager).length) {
        for (let viewID in this.viewManager) {
          if (viewID !== tab.id) {
            this.viewManager[viewID]?.webContents?.closeDevTools();
            this.viewManager[viewID]?.setVisible(false);
          }
        }
      }
    } catch (error) {
      log.error("handleShowViewById error", error);
    } finally {
      if (isViewExist && isViewExist.webContents && !isViewExist.webContents.isFocused()) {
        isViewExist.webContents.focus();
      }
    }
  }

  loadContentView(id: string) {
    const view = this.viewManager[id];
    this.window.contentView.addChildView(view);
    this.viewActive = id;
    view.setVisible(true);
    view.webContents.focus();
  }

  async handleURLChange(tab: ITab) {
    try {
      const { id, url } = tab;
      const view = this.viewManager[id];
      if (!view) {
        console.error(`View with id ${id} not found`);
        return;
      }
      await view.webContents.loadURL(url);
      const viewCookie = await session.defaultSession.cookies.get({ url: new URL(url).origin });

      if (viewCookie.length) {
        viewCookie?.forEach((item) => {
          view.webContents.session.cookies.set({
            url: new URL(url).origin,
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
      console.log(`✅ Loaded URL with ad blocking: ${url}`);
    } catch (error) {
      console.error("❌ Error loading URL:", error);
    }
  }

  handleResizeView(props: IHandleResizeView) {
    const { tab, screen } = props;
    if (!tab.id) return;
    if (!tab || !screen || !this.viewManager[tab.id]) return;
    this.viewManager[tab.id]?.setBounds(screen);
    this.interfaceStore.readFiles<IUserInterface>().then((data) => {
      if (data.layout === "BASIC") this.viewManager[tab.id].setBorderRadius(0);
      else this.viewManager[tab.id].setBorderRadius(8);
    });
  }

  handleHideView(props: { id: string }) {
    if (!props || !props.id) return;
    const view = this.viewManager[props.id];
    if (!view) return;
    if (view.webContents && view.webContents?.isDestroyed()) return;
    if (view && view.webContents && view.webContents.session) {
      if (typeof this.window.webContents.session.flushStorageData === "function") {
        this.window.webContents.session.flushStorageData();
      }
      this.window.contentView.removeChildView(view);
      view.setVisible(false);
    }
  }

  onGoBack(props: { data: ITab }) {
    console.log("props", props);
    if (!props?.data?.id) return;
    const currentView = this.viewManager[props?.data?.id];
    if (!currentView) return;
    if (currentView.webContents.navigationHistory.canGoBack()) {
      currentView.webContents.navigationHistory.goBack();
    }
  }

  async onCloseTab(props: { id: string }) {
    if (!props.id) return;
    await this.handleHideView({ id: props.id });
    const view = this.viewManager[props.id];
    if (view) {
      if (typeof this.viewManager[props.id].removeAllListeners === "function") {
        this.viewManager[props.id].removeAllListeners();
      }
      if (typeof this.viewManager[props.id].webContents.close === "function") {
        this.viewManager[props.id].webContents.close();
      }
    }
    setTimeout(() => {
      delete this.viewManager[props.id];
    }, 500);
  }

  handleToggleDevTools(props: { id: string }) {
    if (!props || !props.id) return;
    const view = this.viewManager[props.id];
    let isOpenedDevTools = view.webContents.isDevToolsOpened();
    view.webContents.toggleDevTools();
    if (isOpenedDevTools) {
      view.webContents.closeDevTools();
      view.isOpenedDevTools = false;
    } else {
      view.webContents.openDevTools();
      view.isOpenedDevTools = true;
    }
  }

  async handleReloadTab(props: ITab) {
    console.log("props.data", props);
    if (!props.id) throw new Error("Tab id not found");
    const view = this.viewManager[props.id];
    if (view) {
      view.webContents.reload();
    } else {
      const { view } = new WebContentsViewController({ tabId: props.id });
      this.viewManager[props.id] = view;
      this.handleActiveView(props.id);
      this.loadContentView(props.id);
    }
  }

  handleActiveView(id: string) {
    this.viewManager[id].setVisible(true);
    this.viewActive = id;
  }

  async cloudSave(props: { data: ITab[]; index: number }) {
    try {
      log.info("cloudSave tabManager data");
      const tabs = props.data.filter((tab) => tab);
      const cookies = session.defaultSession.cookies;
      await Promise.all([this.userStore.saveFiles({ tabs: tabs || [], index: props.index || 0 })]);
      return this.window.webContents.send("SYNC");
    } catch (error) {
      const noti = new Notification({
        title: "Error",
        body: error.message,
      });
      noti.show();
    }
  }

  async getPIPState() {
    const obj: Record<string, boolean> = {};
    for (let id in this.viewManager) {
      obj[id] = this.viewManager[id].webContents.isCurrentlyAudible();
    }
    return obj;
  }

  async requestPIP({ tab }: { tab: ITab }) {
    if (!tab?.id) {
      return new Notification({
        title: "Error",
        body: "Tab id not found",
      }).show();
    }

    const view = this.viewManager[tab.id];
    this.window.contentView;
    if (!view) return;
    if (!view.webContents.isFocused()) {
      view.webContents.focus();
    }
    view.webContents
      .executeJavaScript(
        `
      function enterPictureInPicture(videoElement) {
          if(document.pictureInPictureEnabled && !videoElement.disablePictureInPicture) {
              try {
                  if (document.pictureInPictureElement) {
                      document.exitPictureInPicture();
                  }
                videoElement.requestPictureInPicture().
                  then(() => {
                      console.log('Entered Picture-in-Picture mode.');
                  })
                  .catch((error) => {
                      console.error('Failed to enter Picture-in-Picture mode:', error);
                  });
              } catch(err) {
                  console.error(err);
              }
          }
      }
      setTimeout(() => {
        enterPictureInPicture(document.querySelector("video"));
      }, 500);
      `
      )
      .then(() => {
        log.info("requestPIP success");
      })
      .catch((error) => {
        log.info("requestPIP error", error);
      });
  }

  handleSearchPage(v: any) {
    const view = this.viewManager[this.viewActive];
    log.info("handleSearchPage", view);
    if (!view) return;
    log.info("handleSearchPage clearSelection");

    view.webContents.on("found-in-page", (event, result) => {
      console.log("found-in-page");
      if (result.finalUpdate) view.webContents.stopFindInPage("clearSelection");
    });

    view.webContents.findInPage(v.data, {
      forward: false,
      findNext: true,
      matchCase: true,
    });
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

  clearCache() {
    try {
      // this.window.webContents.session.clearCache(); // RENDERER
      this.viewManager[this.viewActive].webContents.session.clearCache(); // TAB
    } catch (error) {
    }
  }
}
