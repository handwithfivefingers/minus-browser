import { BrowserWindow, WebContentsAudioStateChangedEventParams, WebContentsView } from "electron";
import path from "node:path";
import { v7 as uuid_v7 } from "uuid";
import { ContextMenuController } from "~/main/core/controller/context";
import { historyController } from "~/main/core/controller/history";
import { browserSession } from "~/main/core/services/session";
import { appDb } from "~/main/core/stores";
import { cacheSystem } from "~/features/cacheSystem";
import { CaptureTabPlugin } from "~/features/capture";
import { SearchTabPlugin } from "~/features/search/plugin";
import { TabPluginManager } from "~/features/tabPluginManager";
import { TranslateTabPlugin } from "~/features/translate/plugin";
import { AiTabPlugin } from "~/renderer/main-window/src/features/aiSider/plugin";
import { VaultTabPlugin } from "~/features/vault";
import { ITab, IUserInterface } from "~/shared/types";
import { TabPermission } from "./permission";
interface IDestroy {
  destroy?: () => void;
}

const preloadScript = () => {
  // @ts-ignore
  if (window.__minus_pip_pending) return false;
  // @ts-ignore
  window.__minus_pip_pending = true;

  const video = document.querySelector("video");
  if (!video || !document.pictureInPictureEnabled || video.disablePictureInPicture) {
    // @ts-ignore
    window.__minus_pip_pending = false;
    return false;
  }

  // @ts-ignore
  return new Promise((resolve) => {
    const onLeave = () => {
      // @ts-ignore
      window.__minus_pip_pending = false;
      document.removeEventListener("leavepictureinpicture", onLeave);
      // @ts-ignore
      resolve();
    };

    document.addEventListener("leavepictureinpicture", onLeave, { once: true });

    (async () => {
      try {
        if (document.pictureInPictureElement) {
          await document.exitPictureInPicture();
          document.addEventListener("leavepictureinpicture", onLeave, { once: true });
        }
        // @ts-ignore
        await video.requestPictureInPicture();
      } catch (err) {
        console.error("PiP error:", err);
        onLeave();
      }
    })();
  });
};

export class Tab extends TabPermission {
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
  error?: ITab["error"];
  isBookmarked: boolean = false;
  isHibernated: boolean = false;
  preventHibernate: boolean = false;
  groupId?: string;
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = browserSession;
  lastUpdated?: number;
  referrer?: string;
  private scrollPosition?: { x: number; y: number };
  private pluginManager: TabPluginManager = new TabPluginManager();
  private pluginReady?: Promise<void>;

  private _view: WebContentsView | null = null;
  private _webContents: (Electron.WebContents & IDestroy) | null = null;
  private _userInterface: IUserInterface | null = null;
  eventEmitter: <T>(payload: { channel: string; data: T }) => void;

  setUserInterface(ui: IUserInterface) {
    this._userInterface = ui;
  }

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
    super(props);
    Object.assign(this, props);
    this.resetMediaStates();
    this.eventEmitter = eventEmitter;
  }

  createView() {
    this._view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        session: this.minusSession,
        preload: path.join(__dirname, "notification-preload.js"),
        additionalArguments: [`--notification-tab-id=${this.id}`],
      },
    });
    this._webContents = this._view.webContents;
    this._view.setMaxListeners(30);
    this.createContextMenu();
    this.requestPermissions(this._webContents);
    this.registerCommonEvent();
    this.registerMediaEvents(this._webContents, this.persistInformationToRenderer.bind(this));
    this.isHibernated = false;
    this.pluginReady ??= this.registerPlugin();
  }

  private resetMediaStates() {
    this.audible = false;
    this.isUsingCamera = false;
    this.isUsingMicrophone = false;
    this.isUsingScreenShare = false;
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
    this.resetMediaStates();
    this.persistInformationToRenderer({
      audible: false,
      isUsingCamera: false,
      isUsingMicrophone: false,
      isUsingScreenShare: false,
    });
  }

  hibernate() {
    if (this.isHibernated || !this._view) return;
    this.url = this._webContents?.getURL() || this.url;
    this.title = this._webContents?.getTitle() || this.title;

    this.saveScrollState();
    this.saveReferrer();

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
      this._webContents!.executeJavaScript(`window.scrollTo(${pos.x}, ${pos.y})`).catch(() => {});
    });
    this.scrollPosition = undefined;
  }

  async registerPlugin() {
    try {
      this.pluginManager.unregister(this.id);
      const extensionManager =
        this._userInterface ??
        (await cacheSystem.get<IUserInterface>("interface", async () => {
          const rows = appDb.query<{ key: string; value: string }>(
            "SELECT key, value FROM app_state WHERE key LIKE 'ui_%'",
          );
          const data: Record<string, any> = {};
          for (const row of rows) {
            const k = row.key.replace(/^ui_/, "");
            try {
              data[k] = JSON.parse(row.value);
            } catch {
              data[k] = row.value;
            }
          }
          return data as IUserInterface;
        }));
      if (extensionManager && "extension" in extensionManager) {
        const { vault, translate, userscript } = extensionManager.extension;
        if (vault) {
          const vaulPlugin = new VaultTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data }));
          this.pluginManager.register(vaulPlugin);
        }
        // Script injection is now handled by the userscript preload (registered via session.setPreloads).
        // The UserScriptTabPlugin is kept for potential future use but disabled to avoid double injection.
        // if (userscript) {
        //   this.pluginManager.register(
        //     new UserScriptTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        //   );
        // }
        if (translate) {
          this.pluginManager.register(
            new TranslateTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
          );
        }
        // this.pluginManager.register(
        //   new YoutubeEmbeddingPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        // );
        this.pluginManager.register(
          new SearchTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        );
        this.pluginManager.register(
          new AiTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
        );
        this.pluginManager.register(
          new CaptureTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data })),
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
    this._webContents.on("did-navigate", (_event, url, httpResponseCode, _httpStatusText) => {
      this.updateUrl(url);
      if (url && url !== "about:blank") {
        if (httpResponseCode >= 400) {
          this.handleNavigationError(
            `HTTP_${httpResponseCode}`,
            `HTTP ${httpResponseCode} ${_httpStatusText || ""}`,
            url,
            httpResponseCode,
          );
          return;
        }
        historyController.addEntry(url, this.title, this.favicon);
      }
      this.clearError();
    });
    this._webContents.on("did-navigate-in-page", (_event, url, isMainFrame) => {
      if (isMainFrame) {
        this.updateUrl(url);
        if (url && url !== "about:blank") {
          historyController.addEntry(url, this.title, this.favicon);
        }
      }
    });
    this._webContents.on(
      "did-fail-load",
      (_event, _errorCode, errorDescription, validatedURL, isMainFrame, _frameProcessId, _frameRoutingId) => {
        if (errorDescription === "ERR_ABORTED") return;
        if (!isMainFrame) return;
        if (!validatedURL || validatedURL === "about:blank") return;
        this.handleNavigationError(errorDescription, errorDescription, validatedURL);
      },
    );
    this._webContents.on("audio-state-changed", this.updateAudioState.bind(this));
    this._webContents.on("did-start-loading", this.tabLoading.bind(this, true));
    this._webContents.on("did-stop-loading", this.tabLoading.bind(this, false));
  }

  tabLoading(isLoading: boolean) {
    this.isLoading = isLoading;
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`LOADING:${this.id}`, isLoading);
  }

  clearError() {
    if (!this.error) return;
    this.error = null;
    this.persistInformationToRenderer({ error: null });
  }

  handleNavigationError(errorCode: string, errorDescription: string, url: string, httpResponseCode?: number) {
    const tabError: ITab["error"] = {
      code: errorCode,
      description: this.formatErrorDescription(errorCode, errorDescription),
      url,
      httpResponseCode,
    };
    this.error = tabError;
    this.persistInformationToRenderer({ error: tabError });
  }

  private formatErrorDescription(errorCode: string, _errorDescription: string): string {
    if (errorCode.startsWith("ERR_NAME_NOT_RESOLVED")) return "Server IP address could not be found";
    if (errorCode.startsWith("ERR_CONNECTION_REFUSED")) return "Connection refused";
    if (errorCode.startsWith("ERR_CONNECTION_TIMED_OUT")) return "Connection timed out";
    if (errorCode.startsWith("ERR_CONNECTION_RESET")) return "Connection was reset";
    if (errorCode.startsWith("ERR_INTERNET_DISCONNECTED")) return "Your device is offline";
    if (errorCode.startsWith("ERR_TIMED_OUT")) return "Server took too long to respond";
    if (errorCode.startsWith("ERR_CERT")) return "Certificate invalid";
    if (errorCode.startsWith("HTTP_4")) return `HTTP ${errorCode.replace("HTTP_", "")} Client Error`;
    if (errorCode.startsWith("HTTP_5")) return `HTTP ${errorCode.replace("HTTP_", "")} Server Error`;
    return _errorDescription || "An unknown error occurred";
  }

  private getErrorTitle(errorCode: string): string {
    if (errorCode.startsWith("ERR_NAME_NOT_RESOLVED")) return "This site can't be reached";
    if (errorCode.startsWith("ERR_CONNECTION_REFUSED")) return "This site can't be reached";
    if (errorCode.startsWith("ERR_CONNECTION_TIMED_OUT")) return "This site can't be reached";
    if (errorCode.startsWith("ERR_CONNECTION_RESET")) return "This site can't be reached";
    if (errorCode.startsWith("ERR_INTERNET_DISCONNECTED")) return "No internet";
    if (errorCode.startsWith("ERR_TIMED_OUT")) return "This site took too long to respond";
    if (errorCode.startsWith("ERR_CERT")) return "Your connection is not private";
    if (errorCode.startsWith("HTTP_4") || errorCode.startsWith("HTTP_5")) return "This page isn't working";
    return "Navigation error";
  }

  private loadErrorPage(tabError: ITab["error"]) {
    if (!this._webContents || !tabError) return;
    const title = this.getErrorTitle(tabError.code);
    const html = `<!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .container { text-align: center; max-width: 480px; padding: 40px 24px; }
        .icon { font-size: 64px; margin-bottom: 16px; }
        h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
        .code-badge { display: inline-block; background: #e2e8f0; border-radius: 4px; padding: 2px 8px; font-size: 12px; font-weight: 500; margin-bottom: 12px; }
        p { font-size: 14px; color: #64748b; margin-bottom: 8px; line-height: 1.5; }
        .url { font-size: 13px; color: #94a3b8; word-break: break-all; margin-bottom: 24px; }
        button { background: #6366f1; color: #fff; border: none; border-radius: 6px; padding: 10px 24px; font-size: 14px; font-weight: 500; cursor: pointer; }
        button:hover { background: #4f46e5; }
        button.secondary { background: transparent; color: #6366f1; border: 1px solid #6366f1; margin-left: 8px; }
        button.secondary:hover { background: #eef2ff; }
      </style>
      </head>
      <body>
      <div class="container">
        <div class="icon">${tabError.code.startsWith("HTTP_4") || tabError.code.startsWith("HTTP_5") ? "⚠️" : "🔒"}</div>
        <h1>${title}</h1>
        ${tabError.httpResponseCode ? `<div class="code-badge">${tabError.httpResponseCode}</div>` : ""}
        <p>${tabError.description}</p>
        <div class="url">${tabError.url}</div>
        <button onclick="location.href='${tabError.url}'">Retry</button>
        <button class="secondary" onclick="location.href='https://google.com'">Go to Home</button>
      </div>
      </body>
      </html>`;
    const encoded = encodeURIComponent(html);
    this._webContents.loadURL(`data:text/html;charset=utf-8,${encoded}`);
  }

  updateAudioState({ audible }: WebContentsAudioStateChangedEventParams) {
    this.audible = audible;
    this.persistInformationToRenderer({ audible });
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
    this.persistInformationToRenderer(metaData);
    if (pageUrl && pageUrl !== "about:blank") {
      historyController.updateEntryMetadata(pageUrl, undefined, this.favicon);
    }
  }

  persistInformationToRenderer(information: Partial<ITab>) {
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`TAB_INFORMATION_UPDATED:${this.id}`, information);
  }

  updateTitle() {
    if (this._webContents) {
      this.title = this._webContents.getTitle();
    }
    this.persistInformationToRenderer({ title: this.title });
    if (this.url && this.url !== "about:blank") {
      historyController.updateEntryMetadata(this.url, this.title);
    }
  }

  async updateUrl(url: string) {
    this.url = url;
    this.persistInformationToRenderer({ url: this.url });
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

  toggleMute() {
    if (!this._view) return;
    this.isMuted = !this.isMuted;
    this._view.webContents.setAudioMuted(this.isMuted);
    this.persistInformationToRenderer({ isMuted: this.isMuted });
  }
  onRequestPIP() {
    if (!this.isAlive) return;
    if (!this._webContents!.isFocused()) {
      this._webContents!.focus();
    }
    const script = `(${preloadScript.toString()})()`;
    this._webContents!.executeJavaScript(script)
      .then((res) => {
        if (res === undefined) {
          this.eventEmitter({ channel: "PIP_EXITED", data: { id: this.id } });
        }
      })
      .catch((error) => {
        console.error("requestPIP error", error);
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
    (this.pluginReady || Promise.resolve())
      ?.then(() => this.pluginManager.attachTo(this))
      .catch(() => {
        this.pluginManager.attachTo(this);
      });
  }
  hide() {
    if (this._view && "setVisible" in this._view) this._view.setVisible(false);
  }

  clearCache() {
    if (!this._view) return;
    this._view.webContents.session.clearCache();
    this._view.webContents.session.clearStorageData({
      origin: this.url,
    });
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
      groupId: this.groupId,
      cookies: this.cookies,
      audible: this.audible,
      isMuted: this.isMuted,
      isUsingCamera: this.isUsingCamera,
      isUsingMicrophone: this.isUsingMicrophone,
      isUsingScreenShare: this.isUsingScreenShare,
      blockedNotifications: this.blockedNotifications,
      error: this.error,
    };
  }
}
