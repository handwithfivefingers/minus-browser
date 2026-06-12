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
import { app } from "electron";
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
  cookies?: Electron.Cookie[];
  minusSession: Electron.Session = minusSessionManager.session;
  interface: StoreManager = new StoreManager("interface");
  lastUpdated?: number;
  private pluginManager: TabPluginManager = new TabPluginManager();
  private pluginReady?: Promise<void>;

  view: WebContentsView = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
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
    const adblockPlugin = new AdblockTabPlugin((channel: string, data: any) => this.eventEmitter({ channel, data }));
    if (extensionManager && "extension" in extensionManager) {
      const { vault, translate, adblock, userscript } = extensionManager.extension;
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
    this.webContents.on("page-favicon-updated", this.updateFavicon.bind(this));
    // @ts-ignore
    this.webContents.on("page-title-updated", this.updateTitle.bind(this));
    this.webContents.on("did-navigate", (_event, url) => this.updateUrl(url));
    this.webContents.on("did-navigate-in-page", (_event, url) => this.updateUrl(url));
    this.webContents.on("audio-state-changed", this.updateAudioState.bind(this));
    this.webContents.on("did-start-loading", this.tabLoading.bind(this, true));
    this.webContents.on("did-stop-loading", this.tabLoading.bind(this, false));
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
      url: this.view.webContents.getURL(),
      title: this.view.webContents.getTitle(),
    };
    this.updateTitle();
    this.updateUrl(this.view.webContents.getURL());
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
    this.title = this.view.webContents.getTitle();
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
      isLoading: this.isLoading,
      isPinned: this.isPinned,
      isFocused: this.isFocused,
      index: this.index,
      favicon: this.favicon,
      timestamp: this.timestamp,
      isBookmarked: this.isBookmarked,
      cookies: this.cookies,
      audible: this.audible,
    };
  }
}
