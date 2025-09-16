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
    try {
      const view = new WebContentsView({
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });
      console.log("view", view);
      this.view = view;
      this.webContents = view.webContents;
      view.setMaxListeners(20);
      this.blocker?.setupAdvancedRequestBlocking?.(view);
      this.registerCommonEvent();
      this.registerFocusEvent();
      this.createContextMenu();
      this.registerExtension();
      this.requestPermissions();
      this.applyStyles();
    } catch (error) {
      console.log("error", error);
    }
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
      // console.log("view.webContents.session.setPermissionRequestHandler", permission, webContents, request);
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
        const browserView = BrowserWindow.getFocusedWindow();
        browserView.webContents.send("CREATE_TAB", { url: url });
        return { action: "deny" };
      } catch (error) {
        return { action: "deny" };
      }
    });
  }

  registerCommonEvent() {
    if (!this.webContents) return;
    this.webContents.on("page-favicon-updated", this.pageFaviconUpdated);
  }
  onViewFocus() {
    if (!this.webContents) return;
    if (this.registerEvent) return;
    // this.registerEventListeners();
    const view = this.view;
    this.webContents.on("did-start-loading", this.didStartLoad);
    this.webContents.on("did-stop-loading", this.didStopLoad);
    this.registerEvent = true;
  }
  onViewBlur() {
    if (!this.registerEvent) return;
    if (!this.webContents) return;
    this.webContents.removeListener("did-start-loading", this.didStartLoad);
    this.webContents.removeListener("did-stop-loading", this.didStopLoad);
    this.registerEvent = false;
  }
  registerFocusEvent() {
    if (!this.webContents) return;
    this.webContents.on("focus", this.onViewFocus);
    this.webContents.on("blur", this.onViewBlur);
  }

  destroy() {
    this.webContents.removeAllListeners();
    this.webContents.close();
  }

  createContextMenu() {
    this.webContents.on("context-menu", new ContextMenuController().initialize);
  }

  registerExtension() {
    // new ExtensionController({ extensionName: "GGTranslate", extensionId: "aggiiclaiamajehmlfpkjmlbadmkledi/1.74_0" });
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
  private pageFaviconUpdated = (event: Electron.Event, favicons: string[]) => {
    const window = BrowserWindow.getFocusedWindow();
    const tabId = this.tabId;
    const view = this.view;
    window.webContents.send(`page-favicon-updated:${tabId}`, {
      title: view?.webContents?.getTitle(),
      url: view?.webContents?.getURL(),
      favicon: favicons[0],
    });
  };
}

export { WebContentsViewController };
