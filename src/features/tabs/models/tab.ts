import { BrowserWindow, session, WebContentsView } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { AdblockTabPlugin } from "~/features/adblocker/plugin";
import { cacheSystem } from "~/features/cacheSystem";
import { SearchTabPlugin } from "~/features/search/plugin";
import { StoreManager } from "~/features/system";
import { ContextMenuController } from "~/features/system/controller/context";
import { TabPluginManager } from "~/features/tabPluginManager";
import { TranslateTabPlugin } from "~/features/translate/plugin";
import { UserScriptTabPlugin } from "~/features/userscript/plugin";
import { VaultTabPlugin } from "~/features/vault";
import { ITab, IUserInterface } from "~/shared/types";
interface IDestroy {
  destroy?: () => void;
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

export class Tab {
  id: string = uuid_v7();
  title: string = "New Tab";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = false;
  index?: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = session.fromPartition("persist:minus-browser");
  interface: StoreManager = new StoreManager("interface");
  lastUpdated?: number;
  private pluginManager: TabPluginManager = new TabPluginManager();
  private pluginReady?: Promise<void>;

  view: WebContentsView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // sandbox: true,
      session: this.minusSession,
    },
  });
  webContents: Electron.WebContents & IDestroy;
  eventEmitter: <T>(payload: { channel: string; data: T }) => void;
  constructor({
    eventEmitter,
    ...props
  }: Partial<ITab> & { eventEmitter: <T>(payload: { channel: string; data: T }) => void }) {
    Object.assign(this, props);
    this.webContents = this.view.webContents;
    this.view.setMaxListeners(30);
    this.eventEmitter = eventEmitter;
    this.createContextMenu();
    this.requestPermissions();
    this.applyStyles();
    this.pluginReady = this.registerPlugin();
    this.registerCommonEvent();
  }
  async registerPlugin() {
    this.pluginManager.unregister(this.id);
    const fallback = async () => {
      return this.interface.readFiles<{
        extension: { adblock: boolean; translate: boolean; userscript: boolean; vault: boolean };
      }>();
    };
    const extensionManager = await cacheSystem.get<IUserInterface>("interface", fallback);
    if (extensionManager && "extension" in extensionManager) {
      const { vault, translate, adblock, userscript } = extensionManager.extension;
      if (vault) {
        const vaulPlugin = new VaultTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data }));
        this.pluginManager.register(vaulPlugin);
      }
      if (adblock) {
        const adblockPlugin = new AdblockTabPlugin((channel: string, data: any) =>
          this.eventEmitter({ channel, data }),
        );
        this.pluginManager.register(adblockPlugin);
      }
      if (userscript) {
        this.pluginManager.register(
          new UserScriptTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        );
      }
      if (translate) {
        this.pluginManager.register(
          new TranslateTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        );
      }
      this.pluginManager.register(
        new SearchTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
      );
    }
  }

  registerCommonEvent() {
    this.webContents.on("page-favicon-updated", this.updateFavicon.bind(this));
    // @ts-ignore
    this.webContents.on("page-title-updated", this.updateTitle.bind(this));
    this.webContents.on("did-navigate", (_event, url) => this.updateUrl(url));
    this.webContents.on("did-navigate-in-page", (_event, url) => this.updateUrl(url));
  }

  updateFavicon(event: any, favicons: string[]) {
    this.favicon = favicons[0];
    const metaData = {
      favicon: favicons[0],
      title: this.view.webContents.getTitle(),
      url: this.view.webContents.getURL(),
    };
    this.updateUrl(this.view.webContents.getURL());
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`FAVICON_UPDATED:${this.id}`, metaData);
  }

  updateTitle() {
    this.title = this.view.webContents.getTitle();
  }

  updateUrl(url: string) {
    this.url = url;
  }

  updateTab(tab: Partial<ITab>) {
    Object.assign(this, tab);
  }

  onFocus() {
    this.isFocused = true;
  }

  onBlur() {
    this.isFocused = false;
  }

  private applyStyles() {
    this.view.setBorderRadius(8);
  }

  createContextMenu() {
    this.webContents.on("context-menu", new ContextMenuController().initialize);
  }
  requestPermissions() {
    this.view.webContents.session.setDisplayMediaRequestHandler(
      (request, callback) => {
        callback({ video: request.frame || undefined });
      },
      { useSystemPicker: true },
    );
    this.view.webContents.session.setPermissionRequestHandler((webContents, permission, request) => {
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
    this.view.webContents.setWindowOpenHandler(({ url }) => {
      try {
        const browserView = BrowserWindow.getFocusedWindow();
        browserView?.webContents?.send("CREATE_TAB", { url: url });
        return { action: "deny" };
      } catch (error) {
        return { action: "deny" };
      }
    });
  }
  onRequestPIP() {
    if (!this.view.webContents.isFocused()) {
      this.view.webContents.focus();
    }
    this.view.webContents
      .executeJavaScript(`(${preloadScript.toString()})()`)
      .then(() => {
        console.info("requestPIP success");
      })
      .catch((error) => {
        console.info("requestPIP error", error);
      });
  }
  onReload() {
    this.pluginReady = this.registerPlugin().then(() => {
      this.pluginManager.attachTo(this);
    });
    return this.view.webContents.reload();
  }
  show() {
    if ("setVisible" in this.view && !this.view.getVisible()) {
      this.view.setVisible(true);
    }
    this.pluginReady?.then(() => this.pluginManager.attachTo(this));
  }
  hide() {
    if ("setVisible" in this.view) this.view.setVisible(false);
  }

  clearCache() {
    this.view.webContents.session.clearCache();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      isPinned: this.isPinned,
      isFocused: this.isFocused,
      index: this.index,
      favicon: this.favicon,
      timestamp: this.timestamp,
      isBookmarked: this.isBookmarked,
      cookies: this.cookies,
    };
  }
}
