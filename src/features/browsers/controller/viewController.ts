import { app, BrowserWindow, ipcMain, session, WebContentsView, Notification } from "electron";
import log from "electron-log";
import { IHandleResizeView, IPC, ITab, IViewController } from "../interfaces";
import { storeManager } from "../stores";
import { AdBlocker } from "./adsBlockController";

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
export class ViewController implements IViewController {
  window: BrowserWindow;
  viewManager: Record<string, WebContentsView & { isOpenedDevTools?: boolean }> = {};
  viewActive: string = "";
  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;
  private adBlocker: AdBlocker;
  constructor(window: BrowserWindow) {
    this.window = window;
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
    const data = await storeManager.readFiles();
    const sampleData: { tabs: ITab[]; index: number } = {
      index: 0,
      tabs: [],
    };
    const res = Object.assign(sampleData, data);
    log.info("getTabs", res);
    return res;
  }

  private initializeHandlers() {
    this.invokeHandlers = {
      [TabEventType.GET_TABS]: () => this.getTabs(),
      CLOUD_SAVE: (data) => this.cloudSave(data),
      GET_PIP: () => this.getPIPState(),
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
    };
  }

  async init() {
    ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
    ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    this.adBlocker = await new AdBlocker();
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
    log.info(`[IPC Invoke] channel: ${channel}`, data);
    const handler = this.invokeHandlers[channel];
    if (handler) {
      return handler(data);
    }
    log.warn(`No invoke handler for channel: ${channel}`);
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    log.info(`[IPC Listen] channel: ${channel}`, data);
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
    const { tab, screen } = props;
    if (!tab.id) throw new Error("Tab id not found");
    const isViewExist = this.viewManager[tab.id];
    try {
      if (!isViewExist) {
        const { view } = await this.createContentView(tab.id);
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
      console.log("isViewExist", isViewExist.webContents.isFocused());
      if (isViewExist && !isViewExist.webContents.isFocused()) {
        isViewExist.webContents.focus();
      }
    }
  }

  async createContentView(id: string) {
    const ses = session.fromPartition(`persist:${id}`);
    const view = new WebContentsView({
      webPreferences: {
        session: ses,
        partition: `persist:${id}`,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    const contentView = view.webContents;
    this.adBlocker.setupAdvancedRequestBlocking(view);
    this.adBlocker.setupViewEventHandlers(view);
    this.addViewEventListeners(view, id);
    view.webContents.setFrameRate(60); // DETERMINE FRAME RATE
    return { view, contentView };
  }
  addViewEventListeners(view: WebContentsView, id: string) {
    const didStartLoad = () => {
      // log.info("didStartLoad");
      this.window.webContents.send(`did-start-load:${id}`);
    };
    const didStopLoad = () => {
      this.window.webContents.send(`did-stop-loading:${id}`);
    };
    const pageTitleUpdated = () => {
      this.window.webContents.send(`page-title-updated:${id}`, {
        title: view.webContents.getTitle(),
        url: view.webContents.getURL(),
      });
    };
    const pageFaviconUpdated = (event: Electron.Event, favicons: string[]) => {
      this.window.webContents.send(`page-favicon-updated:${id}`, { favicon: favicons[0] });
    };

    view.webContents.on("did-start-loading", didStartLoad);
    view.webContents.on("did-stop-loading", didStopLoad);
    view.webContents.on("page-title-updated", pageTitleUpdated);
    view.webContents.on("page-favicon-updated", pageFaviconUpdated);

    view.webContents.on("destroyed", () => {
      log.info("destroyed");
      view.webContents.off("did-start-loading", didStartLoad);
      view.webContents.off("did-stop-loading", didStopLoad);
      view.webContents.off("page-title-updated", pageTitleUpdated);
      view.webContents.off("page-favicon-updated", pageFaviconUpdated);
    });
  }

  loadContentView(id: string) {
    const view = this.viewManager[id];
    this.window.contentView.addChildView(view);
    view.setVisible(true);
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
  }

  handleHideView(props: { id: string }) {
    if (!props || !props.id) return;
    const view = this.viewManager[props.id];
    if (view.webContents && view.webContents?.isDestroyed()) return;
    if (view && view.webContents && view.webContents.session) {
      if (typeof view.webContents.session.flushStorageData === "function") view.webContents.session.flushStorageData();
      this.window.contentView.removeChildView(view);
      view.setVisible(false);
    }
  }

  onGoBack(props: { data: ITab }) {
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

  /**
   * @todo
   * 1. handle toggle dev tools
   * 2. show dev tools
   * 3. add flag devtools for future use
   * 4. when call @function handleHideView  -> close dev tools
   * 5. when call @function handleShowViewById  -> check flag -> show dev tools
   */
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

  async handleReloadTab(props: { data: ITab }) {
    if (!props.data.id) throw new Error("Tab id not found");
    const view = this.viewManager[props.data.id];
    if (view) {
      view.webContents.reload();
    } else {
      const { view } = await this.createContentView(props.data.id);
      this.viewManager[props.data.id] = view;
      this.handleActiveView(props.data.id);
      this.loadContentView(props.data.id);
    }
  }

  handleActiveView(id: string) {
    this.viewManager[id].setVisible(true);
    this.viewActive = id;
  }

  async cloudSave(props: { data: ITab[]; index: number }) {
    try {
      log.info("cloudSave tabManager data", props.data, props.index);
      const tabs = props.data.filter((tab) => tab);
      if (props.data.length) {
        for (let tab of tabs) {
          if (!tab.id) continue;
          const view = this.viewManager[tab.id];
          if (view) {
            view.webContents.session.flushStorageData();
          }
        }
      }
      storeManager.saveFiles({ tabs: props.data || [], index: props.index || 0 });

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
}
