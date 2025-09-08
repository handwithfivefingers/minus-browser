import { app, BrowserWindow, ipcMain, session, WebContentsView } from "electron";
import log from "electron-log";
import { ITab } from "../interfaces";
import { storeManager } from "../stores";
import { AdBlocker } from "./adsBlockController";
import fs from "node:fs";
interface IShowViewProps {
  width: number;
  height: number;
  x: number;
  y: number;
  url: string;
}

enum TabEventType {
  CREATE_TAB = "CREATE_TAB",
  UPDATE_TAB = "UPDATE_TAB",
  DELETE_TAB = "DELETE_TAB",
  SELECT_TAB = "SELECT_TAB",
  FOCUS_TAB = "FOCUS_TAB",
  BLUR_TAB = "BLUR_TAB",
  BACKWARD_TAB = "BACKWARD_TAB",
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

enum TAB_UPDATE_TYPE {
  TAB_UPDATED_TITLE = "TAB_UPDATED_TITLE",
  TAB_UPDATED_URL = "TAB_UPDATED_URL",
  TAB_UPDATED_FAVICON = "TAB_UPDATED_FAVICON",
  TAB_UPDATED = "TAB_UPDATED",
}

interface IShowViewProps {
  id: string;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

type IPC<T = any> = {
  channel: string;
  data?: T;
};

interface IHandleResizeView {
  tab: ITab;
  screen: IShowViewProps;
}
interface IViewController {
  window: BrowserWindow;
  viewManager: Record<string, WebContentsView>;
  viewActive: string;
  getTabs: () => Promise<{ tabs: ITab[]; index: number }>;
  handleShowViewById: (props: { data: IHandleResizeView }) => Promise<void>;

  createContentView: (id: string) => Promise<{ view: WebContentsView; contentView: Electron.WebContents }>;
  loadContentView: (id: string) => void;

  handleResizeView: (props: { data: IHandleResizeView }) => void;
  handleHideView: (props: { data: { id: string } }) => void;
  onGoBack: () => void;
  onCloseTab: (props: { data: { id: string } }) => void;
  handleToggleDevTools: (props: { data: { id: string } }) => void;
  handleReloadTab: (props: { data: ITab }) => Promise<void>;
  handleActiveView: (id: string) => void;
  discardInactiveView: () => void;

  cloudSave: (props: { data: ITab[] }) => Promise<void>;
  destroy: () => void;
  init: () => void;
}
export class ViewController implements IViewController {
  window: BrowserWindow;
  viewManager: Record<string, WebContentsView & { isOpenedDevTools?: boolean }> = {};
  viewActive: string = "";
  private invokeHandlers: Record<string, (data?: any) => any>;
  private listenerHandlers: Record<string, (data?: any) => void>;
  domainAlreadyBlockAds = {};
  private adBlocker: AdBlocker;

  get views() {
    const lists = new Map();
    for (let id in this.viewManager) {
      lists.set(id, this.viewManager[id]);
    }
    return lists;
  }

  constructor(window: BrowserWindow) {
    this.window = window;
    this.initializeHandlers();
    this.init();
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
    };

    this.listenerHandlers = {
      [ViewEventType.SHOW_VIEW_BY_ID]: (data) => this.handleShowViewById(data),
      [ViewEventType.VIEW_CHANGE_URL]: (data) => this.handleURLChange(data),
      [ViewEventType.VIEW_RESPONSIVE]: (data) => this.handleResizeView(data),
      [ViewEventType.HIDE_VIEW]: (data) => this.handleHideView(data),
      [TabEventType.BACKWARD_TAB]: () => this.onGoBack(),
      [TabEventType.ON_CLOSE_TAB]: (data) => this.onCloseTab(data),
      [TabEventType.TOGGLE_DEV_TOOLS]: (data) => this.handleToggleDevTools(data),
      [TabEventType.ON_RELOAD]: (data) => this.handleReloadTab(data),
    };
  }

  async init() {
    ipcMain.handle("invoke", (event, args: IPC) => this.onInvoke(args));
    ipcMain.on("send", (event, args: IPC) => this.onListener(args));
    this.adBlocker = await new AdBlocker();
  }

  private onInvoke(args: IPC) {
    const { channel, data } = args;
    // log.info(`[IPC Invoke] channel: ${channel}`, data);
    const handler = this.invokeHandlers[channel];
    if (handler) {
      return handler(data);
    }
    log.warn(`No invoke handler for channel: ${channel}`);
  }

  private onListener(args: IPC) {
    const { channel, data } = args;
    // log.info(`[IPC Listen] channel: ${channel}`, data);
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

  async handleShowViewById(props: { data: IHandleResizeView }) {
    try {
      console.log("handleShowViewById", props.data);
      const { tab } = props.data;
      const isViewExist = this.viewManager[tab.id];
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
            this.viewManager[viewID].webContents?.closeDevTools();
            this.viewManager[viewID].setVisible(false);
          }
        }
      }
      // console.log("this.viewManager", this.viewManager);
      // const newURL = new URL(tab.url);
      // if (!this.domainAlreadyBlockAds[newURL.origin]) {
      //   const ses = this.viewManager[tab.id].webContents.session;
      //   await enableAggressiveAdBlocking(ses);
      //   this.domainAlreadyBlockAds = {
      //     ...this.domainAlreadyBlockAds,
      //     [newURL.origin]: true,
      //   };
      // }
    } catch (error) {
      log.error("handleShowViewById error", error);
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
    this.adBlocker.setupViewEventHandlers(view);
    this.addViewEventListeners(view, id);
    return { view, contentView };
  }
  addViewEventListeners(view: WebContentsView, id: string) {
    const didStartLoad = () => {
      // log.info("didStartLoad");
      this.window.webContents.send(`did-start-load:${id}`);
    };
    const didStopLoad = () => {
      // log.info("didStopLoad");
      this.window.webContents.send(`did-stop-loading:${id}`);
    };
    const pageTitleUpdated = () => {
      // log.info("page-title-updated");
      this.window.webContents.send(`page-title-updated:${id}`, {
        title: view.webContents.getTitle(),
        url: view.webContents.getURL(),
      });
    };
    const pageFaviconUpdated = (event: Electron.Event, favicons: string[]) => {
      // log.info("page-favicon-updated");
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

  async handleURLChange(props: { data: { id: string; url: string } }) {
    try {
      const { id, url } = props.data;
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

  // async requestDisableAds(view: WebContentsView) {
  //   const blocker = await ElectronBlocker.fromLists(
  //     crossFetch,
  //     fullLists,
  //     {
  //       enableCompression: true,
  //     },
  //     {
  //       path: "engine.bin",
  //       read: async (...args) => readFileSync(...args),
  //       write: async (...args) => writeFileSync(...args),
  //     }
  //   );
  //   blocker.enableBlockingInSession(view.webContents.session);
  // }

  handleResizeView(props: { data: IHandleResizeView }) {
    const { tab, screen } = props.data;
    if (!tab || !screen || !this.viewManager[tab.id]) return;
    this.viewManager[tab.id].setBounds(screen);
  }

  handleHideView(props: { data: { id: string } }) {
    if (!props.data || !props.data.id) return;
    const view = this.viewManager[props.data.id];
    view.setVisible(false);
  }

  onGoBack() {
    if (!this.viewActive) return;
    const currentView = this.viewManager[this.viewActive];
    if (!currentView) return;
    if (currentView.webContents.navigationHistory.canGoBack()) {
      currentView.webContents.navigationHistory.goBack();
    }
  }

  onCloseTab(props: { data: { id: string } }) {
    if (!props.data.id) return;
    this.viewManager[props.data.id].removeAllListeners();
    this.viewManager[props.data.id].webContents.close();
    setTimeout(() => {
      delete this.viewManager[props.data.id];
    }, 500);
    // this.window.contentView.removeChildView(this.viewManager[props.data.id]);
  }

  /**
   * @todo
   * 1. handle toggle dev tools
   * 2. show dev tools
   * 3. add flag devtools for future use
   * 4. when call @function handleHideView  -> close dev tools
   * 5. when call @function handleShowViewById  -> check flag -> show dev tools
   */
  handleToggleDevTools(props: { data: { id: string } }) {
    if (!props.data || !props.data.id) return;
    const view = this.viewManager[props.data.id];
    let isOpenedDevTools = view.webContents.isDevToolsOpened();
    view.webContents.toggleDevTools();
    view.isOpenedDevTools = !isOpenedDevTools;
  }

  async handleReloadTab(props: { data: ITab }) {
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

  hideInactiveView() {
    if (this.viewActive && this.viewManager[this.viewActive]) {
      for (let id in Array.from(this.views.values())) {
        if (id !== this.viewActive) {
          this.window.contentView.setVisible(false);
        }
      }
    }
  }

  discardInactiveView() {
    if (this.viewActive && this.viewManager[this.viewActive]) {
      for (let id in Array.from(this.views.values())) {
        if (id !== this.viewActive) {
          this.window.contentView.removeChildView(this.viewManager[id]);
        }
      }
    }
  }

  async cloudSave(props: { data: ITab[]; index: number }) {
    log.info("cloudSave tabManager data", props.data, props.index);
    return storeManager.saveFiles({ tabs: props.data || [], index: props.index || 0 });
  }

  // timeout: NodeJS.Timeout | null = null;
  // maxReconnectAttempts = 5;
  // currentConnectionAttempt = 0;

  // isNetworkError(errorCode: number, errorDescription: string) {
  //   const networkErrorCodes = [
  //     -2, // ERR_FAILED
  //     -21, // ERR_NETWORK_CHANGED
  //     -105, // ERR_NAME_NOT_RESOLVED
  //     -106, // ERR_INTERNET_DISCONNECTED
  //     -107, // ERR_SSL_PROTOCOL_ERROR
  //     -109, // ERR_ADDRESS_UNREACHABLE
  //     -118, // ERR_CONNECTION_TIMED_OUT
  //     -130, // ERR_PROXY_CONNECTION_FAILED
  //   ];

  //   const networkErrorPatterns = [
  //     "ERR_NAME_NOT_RESOLVED",
  //     "ERR_INTERNET_DISCONNECTED",
  //     "ERR_NETWORK_CHANGED",
  //     "ERR_CONNECTION_TIMED_OUT",
  //     "ERR_ADDRESS_UNREACHABLE",
  //   ];

  //   return (
  //     networkErrorCodes.includes(errorCode) ||
  //     networkErrorPatterns.some((pattern) => errorDescription.includes(pattern))
  //   );
  // }

  // handleNetworkError(wc: WebContentsView["webContents"], url: string) {
  //   if (this.currentConnectionAttempt >= this.maxReconnectAttempts) {
  //     console.log("Max reconnection attempts reached");
  //     new Notification({
  //       title: "Error",
  //       body: "Max reconnection attempts reached. Please check your internet connection.",
  //     }).show();
  //     return;
  //   }
  //   this.clearReconnectInterval();
  //   this.timeout = setTimeout(() => {
  //     this.currentConnectionAttempt += 1;
  //     wc.loadURL(url);
  //   }, 15000);
  //   new Notification({
  //     title: "Error",
  //     body: `Network error detected, ${this.currentConnectionAttempt + 1} attempting to reconnect...`,
  //   }).show();
  // }

  // clearReconnectInterval() {
  //   if (this.timeout) {
  //     clearTimeout(this.timeout);
  //     this.timeout = null;
  //   }
  // }

  // resetReconnectAttempts() {
  //   this.maxReconnectAttempts = 0;
  //   this.clearReconnectInterval();
  // }
}
