import { BrowserWindow, WebContentsAudioStateChangedEventParams, WebContentsView } from "electron";
import { v7 as uuid_v7 } from "uuid";
import { cacheSystem } from "~/features/cacheSystem";
import { AiTabPlugin } from "~/features/ui/features/aiSider/plugin";
import { SearchTabPlugin } from "~/features/search/plugin";
import { StoreManager } from "~/core/stores";
import { ContextMenuController } from "~/core/controller/context";
import { TabPluginManager } from "~/features/tabPluginManager";
import { TranslateTabPlugin } from "~/features/translate/plugin";
import { UserScriptTabPlugin } from "~/features/userscript/plugin";
import { VaultTabPlugin } from "~/features/vault";
import { ITab, IUserInterface } from "~/shared/types";
import { browserSession } from "~/core/services/session";
import { historyController } from "~/core/controller/history";
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
  audible: boolean = false;
  isLoading = false;
  index?: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;
  isHibernated: boolean = false;
  preventHibernate: boolean = false;
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = browserSession;
  interface: StoreManager = new StoreManager("interface");
  lastUpdated?: number;
  referrer?: string;
  private scrollPosition?: { x: number; y: number };
  private pluginManager: TabPluginManager = new TabPluginManager();
  private pluginReady?: Promise<void>;

  private _view: WebContentsView | null = null;
  private _webContents: (Electron.WebContents & IDestroy) | null = null;
  eventEmitter: <T>(payload: { channel: string; data: T }) => void;

  get view(): WebContentsView {
    return this._view!;
  }

  get webContents(): Electron.WebContents & IDestroy {
    return this._webContents!;
  }

  get isAlive(): boolean {
    return this._view !== null;
  }

  constructor({
    eventEmitter,
    ...props
  }: Partial<ITab> & { eventEmitter: <T>(payload: { channel: string; data: T }) => void }) {
    Object.assign(this, props);
    this.eventEmitter = eventEmitter;
  }

  createView() {
    this._view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: this.minusSession,
      },
    });
    this._webContents = this._view.webContents;
    this._view.setMaxListeners(30);
    this.createContextMenu();
    this.requestPermissions();
    this.registerCommonEvent();
    this.isHibernated = false;
    this.pluginReady ??= this.registerPlugin();
  }

  destroyView() {
    if (!this._view) return;
    try {
      this._view.webContents.close();
    } catch {
      // ignore close errors
    }
    this._view = null;
    this._webContents = null;
  }

  hibernate() {
    if (this.isHibernated || !this._view) return;
    this.url = this._webContents?.getURL() || this.url;
    this.title = this._webContents?.getTitle() || this.title;

    this.saveScrollState();
    this.saveReferrer();

    console.log("Tab will hibernate", this.title);
    this.destroyView();
    this.isHibernated = true;
  }

  private saveScrollState() {
    if (!this._webContents) return;
    this._webContents
      .executeJavaScript("({ x: window.scrollX, y: window.scrollY })")
      .then((pos: { x: number; y: number }) => {
        this.scrollPosition = pos;
      })
      .catch(() => {});
  }

  private saveReferrer() {
    if (!this._webContents) return;
    this._webContents
      .executeJavaScript("document.referrer || ''")
      .then((ref: string) => {
        if (ref) this.referrer = ref;
      })
      .catch(() => {});
  }

  wake(url?: string) {
    if (!this.isHibernated) return;
    this.createView();
    this.pluginReady = this.registerPlugin();
    this.webContents.loadURL(url || this.url, {
      httpReferrer: this.referrer || undefined,
    });
    this.isHibernated = false;
    this.restoreScrollState();
  }

  private restoreScrollState() {
    const pos = this.scrollPosition;
    if (!pos || !this._webContents) return;
    this._webContents.once("did-finish-load", () => {
      this._webContents!
        .executeJavaScript(`window.scrollTo(${pos.x}, ${pos.y})`)
        .catch(() => {});
    });
    this.scrollPosition = undefined;
  }

  async registerPlugin() {
    try {
      this.pluginManager.unregister(this.id);
      const fallback = async () => {
        return this.interface.readFiles<{
          extension: {
            translate: boolean;
            userscript: boolean;
            vault: boolean;
          };
        }>();
      };
      const extensionManager = await cacheSystem.get<IUserInterface>("interface", fallback);
      if (extensionManager && "extension" in extensionManager) {
        const { vault, translate, userscript } = extensionManager.extension;
        if (vault) {
          const vaulPlugin = new VaultTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data }));
          this.pluginManager.register(vaulPlugin);
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
        this.pluginManager.register(
          new AiTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        );
      }
    } catch (err) {
      console.error("registerPlugin error", err);
    }
  }

  registerCommonEvent() {
    if (!this._webContents) return;
    this._webContents.on("page-favicon-updated", this.updateFavicon.bind(this));
    // @ts-ignore
    this._webContents.on("page-title-updated", this.updateTitle.bind(this));
    this._webContents.on("did-navigate", (_event, url, _httpResponseCode, _httpStatusText) => {
      this.updateUrl(url);
      if (url && url !== "about:blank") {
        historyController.addEntry(url, this.title, this.favicon);
      }
    });
    this._webContents.on("did-navigate-in-page", (_event, url, isMainFrame) => {
      if (isMainFrame) {
        this.updateUrl(url);
        if (url && url !== "about:blank") {
          historyController.addEntry(url, this.title, this.favicon);
        }
      }
    });
    this._webContents.on("audio-state-changed", this.updateAudioState.bind(this));
    this._webContents.on("did-start-loading", this.tabLoading.bind(this, true));
    this._webContents.on("did-stop-loading", this.tabLoading.bind(this, false));
  }

  tabLoading(isLoading: boolean) {
    this.isLoading = isLoading;
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`LOADING:${this.id}`, isLoading);
  }

  updateAudioState({ audible }: WebContentsAudioStateChangedEventParams) {
    this.audible = audible;
    this.peristInformationToRenderer({ audible });
  }

  updateFavicon(event: any, favicons: string[]) {
    this.favicon = favicons[0];
    const pageUrl = this._webContents?.getURL() || this.url;
    const metaData = {
      favicon: favicons[0],
      url: pageUrl,
      title: this._webContents?.getTitle() || this.title,
    };
    this.updateTitle();
    this.updateUrl(pageUrl);
    this.peristInformationToRenderer(metaData);
    if (pageUrl && pageUrl !== "about:blank") {
      historyController.updateEntryMetadata(pageUrl, undefined, this.favicon);
    }
  }

  peristInformationToRenderer(information: Partial<ITab>) {
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`TAB_INFORMATION_UPDATED:${this.id}`, information);
  }

  updateTitle() {
    if (this._webContents) {
      this.title = this._webContents.getTitle();
    }
    this.peristInformationToRenderer({ title: this.title });
    if (this.url && this.url !== "about:blank") {
      historyController.updateEntryMetadata(this.url, this.title);
    }
  }

  async updateUrl(url: string) {
    this.url = url;
    this.peristInformationToRenderer({ url: this.url });
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

  createContextMenu() {
    if (!this._webContents) return;
    this._webContents.on("context-menu", new ContextMenuController().initialize);
  }
  requestPermissions() {
    if (!this._view) return;
    this._view.webContents.session.setDisplayMediaRequestHandler(
      (request, callback) => {
        callback({ video: request.frame || undefined });
      },
      { useSystemPicker: true },
    );
    this._view.webContents.session.setPermissionRequestHandler((webContents, permission, request) => {
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
    this._view.webContents.setWindowOpenHandler(({ url }) => {
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
    if (!this.isAlive) return;
    if (!this._webContents!.isFocused()) {
      this._webContents!.focus();
    }
    this._webContents!.executeJavaScript(`(${preloadScript.toString()})()`)
      .then(() => {
        console.info("requestPIP success");
      })
      .catch((error) => {
        console.info("requestPIP error", error);
      });
  }
  onReload() {
    if (!this.isAlive) return;
    this.pluginReady = this.registerPlugin().then(() => {
      this.pluginManager.attachTo(this);
    });
    return this._view!.webContents.reload();
  }
  show() {
    if (this.isHibernated) this.wake();
    if (this._view && "setVisible" in this._view && !this._view.getVisible()) {
      this._view.setVisible(true);
    }
    (this.pluginReady || Promise.resolve())?.then(() => this.pluginManager.attachTo(this)).catch(() => {
      this.pluginManager.attachTo(this);
    });
  }
  hide() {
    if (this._view && "setVisible" in this._view) this._view.setVisible(false);
  }

  clearCache() {
    if (!this._view) return;
    this._view.webContents.session.clearCache();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      url: this.url,
      isLoading: this.isLoading,
      isPinned: this.isPinned,
      isFocused: this.isFocused,
      index: this.index,
      favicon: this.favicon,
      timestamp: this.timestamp,
      isBookmarked: this.isBookmarked,
      isHibernated: this.isHibernated,
      preventHibernate: this.preventHibernate,
      cookies: this.cookies,
      audible: this.audible,
    };
  }
}
