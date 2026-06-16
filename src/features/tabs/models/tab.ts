import { BrowserWindow, WebContentsAudioStateChangedEventParams, WebContentsView } from "electron";
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
import { minusSessionManager } from "~/features/system/services/session";
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
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = minusSessionManager.session;
  interface: StoreManager = new StoreManager("interface");
  lastUpdated?: number;
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
    console.log("Tab will hibernate", this.title);
    this.destroyView();
    this.isHibernated = true;
  }

  wake() {
    if (!this.isHibernated) return;
    this.createView();
    this.pluginReady = this.registerPlugin();
    this.webContents.loadURL(this.url);
    this.isHibernated = false;
  }

  async registerPlugin() {
    this.pluginManager.unregister(this.id);
    const fallback = async () => {
      return this.interface.readFiles<{
        extension: {
          adblock: boolean;
          translate: boolean;
          userscript: boolean;
          vault: boolean;
          disabledFilters: string[];
        };
      }>();
    };
    const extensionManager = await cacheSystem.get<IUserInterface>("interface", fallback);
    if (extensionManager && "extension" in extensionManager) {
      const { vault, translate, adblock, userscript, disabledFilters } = extensionManager.extension;
      const adblockPlugin = new AdblockTabPlugin(
        (channel: string, data: any) => this.eventEmitter({ channel, data }),
        disabledFilters || [],
      );
      if (vault) {
        const vaulPlugin = new VaultTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data }));
        this.pluginManager.register(vaulPlugin);
      }
      if (adblock) {
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
    if (!this._webContents) return;
    this._webContents.on("page-favicon-updated", this.updateFavicon.bind(this));
    // @ts-ignore
    this._webContents.on("page-title-updated", this.updateTitle.bind(this));
    this._webContents.on("did-navigate", (_event, url) => this.updateUrl(url));
    this._webContents.on("did-navigate-in-page", (_event, url) => this.updateUrl(url));
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
    const metaData = {
      favicon: favicons[0],
      url: this._webContents?.getURL() || this.url,
      title: this._webContents?.getTitle() || this.title,
    };
    this.updateTitle();
    this.updateUrl(this._webContents?.getURL() || this.url);
    this.peristInformationToRenderer(metaData);
  }

  peristInformationToRenderer(information: Partial<ITab>) {
    const browser = BrowserWindow.getFocusedWindow();
    browser?.webContents?.send(`TAB_INFORMATION_UPDATED:${this.id}`, information);
  }

  // async loadSession(url: string) {
  //   // const domain = new URL(url).hostname;
  //   // const { subDomains, domain, topLevelDomains } = parseDomain(fromUrl(url));

  //   const domainData = await analyzeDomain(url);

  //   if (!domainData.domain) {
  //     console.log("URL không hợp lệ, bỏ qua load session");
  //     return;
  //   }
  //   const targetDomain = domainData.domain;

  //   let session = await cacheSystem.get<Electron.Cookie[]>("session");
  //   if (!session?.length) return;
  //   // let cookies = session?.filter(
  //   //   (cookie) =>
  //   //     (cookie.domain?.includes(domain) || (cookie?.domain && domain.includes(cookie?.domain))) &&
  //   //     cookie?.expirationDate &&
  //   //     cookie?.expirationDate * 1000 > Date.now(),
  //   // );

  //   let cookies = session.filter((cookie) => {
  //     if (!cookie.domain || !cookie.expirationDate) return false;

  //     // Kiểm tra hạn sử dụng (Electron expirationDate tính bằng giây)
  //     const isExpired = cookie.expirationDate * 1000 <= Date.now();
  //     if (isExpired) return false;

  //     // Chuẩn hóa domain của cookie để so sánh (xóa dấu chấm đầu nếu có, ví dụ: .example.com -> example.com)
  //     const cleanCookieDomain = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
  //     let currentHostname = "";
  //     try {
  //       currentHostname = new URL(url).hostname;
  //     } catch (_) {
  //       currentHostname = targetDomain;
  //     }

  //     // Khớp nếu cookie domain chứa target domain HOẶC ngược lại (hỗ trợ chia sẻ session giữa subdomains)
  //     return currentHostname.endsWith(cleanCookieDomain) || cleanCookieDomain.endsWith(currentHostname);

  //   });

  //   if (!cookies?.length) return;
  //   let uniqCookie = new Map<string, Electron.Cookie>();
  //   for (let c of cookies) {
  //     uniqCookie.set(c.name, c);
  //   }
  //   if (uniqCookie.size === 0) return;
  //   let pm: Promise<any>[] = [];

  //   let protocol = "https:";
  //   try {
  //     protocol = new URL(url).protocol;
  //   } catch (_) {}

  //   [...uniqCookie.values()].forEach((cookie) => {
  //     if (cookie?.expirationDate && cookie?.expirationDate * 1000 > Date.now()) {
  //       const cleanDomainForUrl = cookie.domain!.startsWith(".") ? cookie.domain!.slice(1) : cookie.domain;
  //       const cookieUrl = `${protocol}//${cleanDomainForUrl}${cookie.path || "/"}`;
  //       const cookieDetails: Electron.CookiesSetDetails = {
  //         url: cookieUrl, // Sửa lỗi quan trọng: Phải truyền URL đầy đủ, không truyền độc domain
  //         name: cookie.name,
  //         value: cookie.value,
  //         domain: cookie.domain, // Giữ nguyên domain gốc (ví dụ: .example.com) để bao phủ subdomain
  //         expirationDate: cookie.expirationDate,
  //         sameSite: cookie.sameSite,
  //         secure: cookie.secure,
  //         httpOnly: cookie.httpOnly,
  //         path: cookie.path || "/",
  //       };

  //       pm.push(this.webContents.session.cookies.set(cookieDetails));
  //     }
  //   });
  //   await Promise.all(pm)
  //     .then(() => {
  //       console.log("cookie loaded");
  //     })
  //     .catch((errr) => {
  //       console.log("Err", errr);
  //     });
  // }

  updateTitle() {
    if (this._webContents) {
      this.title = this._webContents.getTitle();
    }
    this.peristInformationToRenderer({ title: this.title });
  }

  async updateUrl(url: string) {
    this.url = url;
    this.peristInformationToRenderer({ title: this.url });
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
    this.pluginReady?.then(() => this.pluginManager.attachTo(this));
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
      cookies: this.cookies,
      audible: this.audible,
    };
  }
}
