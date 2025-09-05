import { BrowserWindow, ipcMain, Notification, WebContentsView, app, session } from "electron";
import { ITab } from "../interfaces";
import TabManager, { TabEventType } from "./tabManager";
import log from "electron-log";
import { storeManager } from "../stores";
import fs from "node:fs";
interface IShowViewProps {
  width: number;
  height: number;
  x: number;
  y: number;
  url: string;
}

export enum ViewEventType {
  SHOW_VIEW_BY_ID = "SHOW_VIEW_BY_ID",
  VIEW_RESPONSIVE = "VIEW_RESPONSIVE",
  SHOW_VIEW = "SHOW_VIEW",
  HIDE_VIEW = "HIDE_VIEW",
  UPDATE_VIEW_SIZE = "UPDATE_VIEW_SIZE",
  VIEW_CHANGE_URL = "VIEW_CHANGE_URL",
}

export enum TAB_UPDATE_TYPE {
  TAB_UPDATED_TITLE = "TAB_UPDATED_TITLE",
  TAB_UPDATED_URL = "TAB_UPDATED_URL",
  TAB_UPDATED_FAVICON = "TAB_UPDATED_FAVICON",
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
export class ViewController {
  tabManager: TabManager;

  window: BrowserWindow;

  viewManager: Record<ITab["id"], WebContentsView> = {};

  viewActive: ITab["id"] = "";

  get views() {
    const lists = new Map();
    for (let id in this.viewManager) {
      lists.set(id, this.viewManager[id]);
    }
    return lists;
  }

  constructor(window: BrowserWindow) {
    storeManager.readFiles().then((data) => {
      log.info("storeManager data", data);
      this.tabManager = new TabManager(data as { tabs: ITab[]; index: number });
      this.window = window;
      log.info("tabManager", this.tabManager);
      this.init();
    });

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

  init() {
    ipcMain.handle(TabEventType.GET_TABS, () => this.tabManager.getTabs);
    ipcMain.handle(TabEventType.GET_TAB, (event, id: string) => this.tabManager.getTab(id));
    ipcMain.handle(TabEventType.CREATE_TAB, (event, tab: Partial<ITab>) => this.tabManager.createTab(tab));

    ipcMain.on(TabEventType.UPDATE_TAB, (event, id: string, updateParams: Partial<ITab>) =>
      this.tabManager.updateTab(id, updateParams)
    );
    ipcMain.on(TabEventType.DELETE_TAB, (event, id: string) => this.tabManager.deleteTab(id));
    ipcMain.on(TabEventType.SELECT_TAB, (event, id: string) => this.tabManager.selectTab(id));

    ipcMain.on(ViewEventType.SHOW_VIEW_BY_ID, async (event, props: IShowViewProps) => this.handleShowViewById(props));
    ipcMain.on(ViewEventType.VIEW_CHANGE_URL, (event, { url, id }) => this.handleURLChange(url, id));

    ipcMain.on(ViewEventType.VIEW_RESPONSIVE, (event, props: IShowViewProps) => this.handleResizeView(props));
    ipcMain.on(ViewEventType.HIDE_VIEW, (event, props: { id: string }) => this.handleHideView(props.id));

    // HANDLE TAB_FORWARD_BACKWARD

    ipcMain.on(TabEventType.BACKWARD_TAB, () => this.onGoBack());
    ipcMain.on(TabEventType.FORWARD_TAB, () => this.onGoForward());

    ipcMain.on(TabEventType.TOGGLE_DEV_TOOLS, (event, props: { id: string }) => this.handleToggleDevTools(props.id));
    ipcMain.on(TabEventType.ON_RELOAD, (event, props: { id: string }) => this.handleReloadTab(props.id));
  }

  destroy() {
    this.viewActive = "";
    // this.viewManager = {};
    for (let key in this.viewManager) {
      this.viewManager[key].webContents.session.flushStorageData();
    }
    this.viewManager = {};
    this.window = null;
    this.tabManager = null;
  }

  async handleShowViewById(props: IShowViewProps) {
    try {
      const { id } = props;
      const tab = this.tabManager.getTab(id);
      log.info("tab", tab, id);
      log.info("this.tabManager", this.tabManager);
      log.info("this.tabManager", this.tabManager.tabs.get(`${id}`));
      if (!tab) return;
      tab.onFocus();
      const isViewExist = this.viewManager[id];
      if (!isViewExist) {
        const { view } = this.createContentView(id, tab.url);
        this.viewManager[id] = view;
        this.loadContentView(id);
        await view.webContents.loadURL(tab.url);
        view.webContents.on("page-title-updated", () => {
          if (this.viewActive && this.viewManager[this.viewActive]) {
            this.updateViewTitle(this.viewActive, this.viewManager[this.viewActive]);
            this.updateViewURL(this.viewActive, this.viewManager[this.viewActive]);
          }
        });
        view.webContents.on("page-favicon-updated", (event, favicons) => {
          if (this.viewActive && this.viewManager[this.viewActive]) {
            this.updateViewFavicon(this.viewActive, favicons[0]);
          }
        });
      } else {
        this.loadContentView(id);
      }
      this.handleActiveView(id);
      this.handleResizeView(props);
    } catch (error) {
      log.error("handleShowViewById error", error);
    }
  }

  createContentView(id: string, domain: string) {
    const domainURL = new URL(domain);
    const ses = session.fromPartition(`persist:${domainURL.origin}`);
    console.log("ses", ses.cookies);
    const view = new WebContentsView({
      webPreferences: {
        partition: `persist:${domainURL.origin}`,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });
    const contentView = view.webContents;
    return { view, contentView };
  }

  loadContentView(id: string) {
    const view = this.viewManager[id];
    this.window.contentView.addChildView(view);
    view.setVisible(true);
  }

  updateViewTitle(id: string, view: WebContentsView) {
    this.window.webContents.send(TAB_UPDATE_TYPE.TAB_UPDATED_TITLE, {
      id,
      title: view.webContents.getTitle(),
    });
  }

  updateViewURL(id: string, view: WebContentsView) {
    this.tabManager.updateTab(id, { url: view.webContents.getURL() });
    this.window.webContents.send(TAB_UPDATE_TYPE.TAB_UPDATED_URL, {
      id,
      url: view.webContents.getURL(),
    });
  }

  updateViewFavicon(id: string, favicon: string) {
    this.tabManager.updateTab(id, { favicon });
    this.window.webContents.send(TAB_UPDATE_TYPE.TAB_UPDATED_FAVICON, {
      id,
      favicon,
    });
  }

  async handleURLChange(url: string, id: string) {
    const view = this.viewManager[id];
    this.tabManager.updateTab(id, { url });
    if (view) {
      await view.webContents.loadURL(url);
    }
  }

  handleResizeView({ id, screen }: IShowViewProps) {
    const view = this.viewManager[id];
    if (view) view.setBounds(screen);
  }

  handleHideView(tabId: string) {
    const view = this.viewManager[tabId];
    if (view) {
      view.setVisible(false);
    }
  }

  onGoBack() {
    const currentView = this.viewManager[this.viewActive];
    if (!currentView) return;
    if (currentView.webContents.navigationHistory.canGoBack()) {
      currentView.webContents.navigationHistory.goBack();
      const url = currentView.webContents.getURL();
      this.tabManager.updateTab(this.viewActive, { url });
    }
  }

  onGoForward() {
    const currentView = this.viewManager[this.viewActive];
    if (!currentView) return;
    if (currentView.webContents.navigationHistory.canGoForward()) {
      currentView.webContents.navigationHistory.goForward();
      const url = currentView.webContents.getURL();
      this.tabManager.updateTab(this.viewActive, { url });
    }
  }

  handleToggleDevTools(id: string) {
    const view = this.viewManager[id];
    if (view) {
      view.webContents.toggleDevTools();
    }
  }

  handleReloadTab(id: string) {
    const view = this.viewManager[id];
    if (view) {
      view.webContents.reload();
    } else {
      const tab = this.tabManager.getTab(id);
      if (!tab) return;
      const { view } = this.createContentView(id, tab.url);
      this.viewManager[id] = view;
      this.handleActiveView(id);
      this.loadContentView(id);
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

  // For Retry Reconnection

  timeout: NodeJS.Timeout | null = null;
  maxReconnectAttempts = 5;
  currentConnectionAttempt = 0;

  isNetworkError(errorCode: number, errorDescription: string) {
    const networkErrorCodes = [
      -2, // ERR_FAILED
      -21, // ERR_NETWORK_CHANGED
      -105, // ERR_NAME_NOT_RESOLVED
      -106, // ERR_INTERNET_DISCONNECTED
      -107, // ERR_SSL_PROTOCOL_ERROR
      -109, // ERR_ADDRESS_UNREACHABLE
      -118, // ERR_CONNECTION_TIMED_OUT
      -130, // ERR_PROXY_CONNECTION_FAILED
    ];

    const networkErrorPatterns = [
      "ERR_NAME_NOT_RESOLVED",
      "ERR_INTERNET_DISCONNECTED",
      "ERR_NETWORK_CHANGED",
      "ERR_CONNECTION_TIMED_OUT",
      "ERR_ADDRESS_UNREACHABLE",
    ];

    return (
      networkErrorCodes.includes(errorCode) ||
      networkErrorPatterns.some((pattern) => errorDescription.includes(pattern))
    );
  }

  handleNetworkError(wc: WebContentsView["webContents"], url: string) {
    if (this.currentConnectionAttempt >= this.maxReconnectAttempts) {
      console.log("Max reconnection attempts reached");
      new Notification({
        title: "Error",
        body: "Max reconnection attempts reached. Please check your internet connection.",
      }).show();
      return;
    }
    this.clearReconnectInterval();
    this.timeout = setTimeout(() => {
      this.currentConnectionAttempt += 1;
      wc.loadURL(url);
    }, 15000);
    new Notification({
      title: "Error",
      body: `Network error detected, ${this.currentConnectionAttempt + 1} attempting to reconnect...`,
    }).show();
  }

  clearReconnectInterval() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
  resetReconnectAttempts() {
    this.maxReconnectAttempts = 0;
    this.clearReconnectInterval();
  }

  async cloudSave() {
    log.info("cloudSave");
    const data = this.tabManager.toString();
    log.info("cloudSave tabManager data", data);
    return fs.writeFileSync(storeManager.configFile, data, "utf-8");
  }
}
