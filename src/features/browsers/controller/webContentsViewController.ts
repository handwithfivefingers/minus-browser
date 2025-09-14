import { BrowserWindow, WebContentsView } from "electron";
import { ExtensionController } from "../../extensions";
import { AdBlocker } from "./adsBlockController";
import { ContextMenuController } from "./contextMenuController";
interface IDestroy {
  // Previous interface
  destroy?: () => void;
}

class WebContentsViewController {
  view: WebContentsView;
  webContents: Electron.WebContents & IDestroy;
  tabId: string;
  blocker: AdBlocker;
  registerEvent: boolean = false;
  constructor(props: { tabId: string; blocker?: AdBlocker }) {
    Object.assign(this, props);
    this.initialize();
  }
  initialize() {
    const view = new WebContentsView();
    this.view = view;
    this.webContents = view.webContents;
    view.setMaxListeners(20);
    this.blocker?.setupAdvancedRequestBlocking?.(view);
    this.requestPermissions();
    this.registerFocusEvent();
    this.applyStyles();
    this.createContextMenu();
    this.registerExtension();
    console.log("view.getMaxListeners()");
  }

  requestPermissions() {
    const view = this.view;
    view.webContents.session.setDisplayMediaRequestHandler(
      (request, callback) => {
        callback({ video: request.frame });
      },
      { useSystemPicker: true }
    );
    // view.webContents.session.setPermissionCheckHandler((webContents, permission, request) => {
    //   console.log("view.webContents.session.setPermissionCheckHandler", permission);
    //   return true;
    // });
    view.webContents.session.setPermissionRequestHandler((webContents, permission, request) => {
      // 'clipboard-read' | 'clipboard-sanitized-write' | 'display-capture' | 'fullscreen' | 'geolocation' | 'idle-detection' | 'media' | 'mediaKeySystem' | 'midi' | 'midiSysex' | 'notifications' | 'pointerLock' | 'keyboardLock' | 'openExternal' | 'speaker-selection' | 'storage-access' | 'top-level-storage-access' | 'window-management' | 'unknown' | 'fileSystem',
      console.log("view.webContents.session.setPermissionRequestHandler", permission, webContents, request);
      if (
        permission === "unknown" ||
        permission === "fileSystem" ||
        permission === "storage-access" ||
        permission === "top-level-storage-access" ||
        permission === "mediaKeySystem"
      ) {
        return request(false);
      }
      return request(true);
    });

    view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const validURL = new URL(url);
        console.log("Open as new tab", validURL);
        const browserView = BrowserWindow.getFocusedWindow();
        browserView.webContents.send("CREATE_TAB", { url: url });
        return { action: "deny" };
      } catch (error) {
        return { action: "deny" };
      }
    });
  }

  registerFocusEvent() {
    const view = this.view;
    const tabId = this.tabId;
    view.webContents.on("focus", () => {
      console.log("focus on tab", tabId);
      if (this.registerEvent) return;
      this.registerEventListeners();
    });
    view.webContents.on("blur", () => {
      console.log("blur on tab", tabId);
      if (!this.registerEvent) return;
      this.unregisterFocusEvent();
    });
  }

  registerEventListeners() {
    const view = this.view;
    view.webContents.on("did-start-loading", this.didStartLoad);
    view.webContents.on("did-stop-loading", this.didStopLoad);
    view.webContents.on("page-title-updated", this.pageTitleUpdated);
    view.webContents.on("page-favicon-updated", this.pageFaviconUpdated);
    this.registerEvent = true;
  }

  destroy() {
    this.view.webContents.removeAllListeners();
    this.view.webContents.close();
  }

  unregisterFocusEvent() {
    const view = this.view;
    view.webContents.removeListener("did-start-loading", this.didStartLoad);
    view.webContents.removeListener("did-stop-loading", this.didStopLoad);
    view.webContents.removeListener("page-title-updated", this.pageTitleUpdated);
    view.webContents.removeListener("page-favicon-updated", this.pageFaviconUpdated);
    this.registerEvent = false;
  }

  createContextMenu() {
    this.webContents.on("context-menu", new ContextMenuController().initialize);
  }

  registerExtension() {
    new ExtensionController({ extensionName: "GGTranslate", extensionId: "aggiiclaiamajehmlfpkjmlbadmkledi/1.74_0" });
  }

  private applyStyles() {
    this.view.setBorderRadius(8);
  }

  private didStartLoad = () => {
    const window = BrowserWindow.getFocusedWindow();
    const tabId = this.tabId;
    window.webContents.send(`did-start-load:${tabId}`);
  };
  private didStopLoad = () => {
    const window = BrowserWindow.getFocusedWindow();
    const tabId = this.tabId;
    window.webContents.send(`did-stop-loading:${tabId}`);
  };
  private pageTitleUpdated = () => {
    const window = BrowserWindow.getFocusedWindow();
    const tabId = this.tabId;
    const view = this.view;
    window.webContents.send(`page-title-updated:${tabId}`, {
      title: view.webContents.getTitle(),
      url: view.webContents.getURL(),
    });
  };
  private pageFaviconUpdated = (event: Electron.Event, favicons: string[]) => {
    const window = BrowserWindow.getFocusedWindow();
    const tabId = this.tabId;
    window.webContents.send(`page-favicon-updated:${tabId}`, { favicon: favicons[0] });
  };
}

export { WebContentsViewController };
