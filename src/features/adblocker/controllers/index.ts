import { ipcMain, WebContents } from "electron";
import { FiltersEngine, Request } from "@ghostery/adblocker";
import fetch from "cross-fetch";
import path from "node:path";
import log from "electron-log";
import { AdblockService } from "../services";
import { parse } from "tldts-experimental";

const baseDir = `https://raw.githubusercontent.com/brave/adblock-lists-mirror/lists/lists/metadata.json`;

export class AdBlocker {
  engine: FiltersEngine | undefined;
  AdblockService = new AdblockService();
  isInitialize = false;
  isEnabled = false;
  private initializing?: Promise<void>;
  private lastDisabledKey = "";
  private _disabledFilters: string[] = [];
  private ipcHandlersRegistered = false;
  private session: Electron.Session | null = null;
  private watchedWebContents = new Map<number, () => void>();

  async initialize(disabledFilters?: string[]) {
    if (disabledFilters !== undefined) {
      this._disabledFilters = disabledFilters;
    }
    const key = [...this._disabledFilters].sort().join(",");
    if (this.isInitialize && this.lastDisabledKey === key) return;

    if (this.initializing) {
      await this.initializing;
      this.initializing = undefined;
      if (this.isInitialize && this.lastDisabledKey === key) return;
    }

    this.isInitialize = false;
    this.lastDisabledKey = key;
    this.initializing = this.load();
    return this.initializing;
  }

  private async load() {
    try {
      const metaData = await fetch(baseDir).then((res) => res.text());
      const fullList: Record<string, string> = JSON.parse(metaData);
      const disabledSet = new Set(this._disabledFilters);
      const fullLists = Object.keys(fullList)
        .filter((key) => !disabledSet.has(key))
        .map((key) => fullList[key]);

      this.engine = await FiltersEngine.fromLists(fetch, fullLists, {
        enableCompression: true,
        loadCosmeticFilters: true,
        loadNetworkFilters: true,
        loadCSPFilters: true,
      });
      this.isInitialize = true;
      this.registerIPCHandlers();
    } catch (error) {
      console.log("Adblocker load error", error);
    }
  }

  private registerIPCHandlers() {
    if (this.ipcHandlersRegistered) return;
    this.ipcHandlersRegistered = true;

    ipcMain.handle("@adb/inject-cosmetic-filters", async (event, url: string, msg?: any) => {
      if (!this.engine) return;

      try {
        const parsed = parse(url);
        const hostname = parsed.hostname || "";
        const domain = parsed.domain || "";
        const isFirstRun = msg === undefined;

        const { active, styles, scripts } = this.engine.getCosmeticsFilters({
          url,
          hostname,
          domain,
          classes: msg?.classes,
          hrefs: msg?.hrefs,
          ids: msg?.ids,
          getBaseRules: isFirstRun,
          getInjectionRules: isFirstRun,
          getExtendedRules: false,
          getRulesFromHostname: isFirstRun,
          getRulesFromDOM: !isFirstRun,
          callerContext: {
            frameId: event.frameId,
            processId: event.processId,
            lifecycle: msg?.lifecycle,
          },
        });

        if (active === false) return;

        if (styles.length > 0) {
          event.sender.insertCSS(styles, { cssOrigin: "user" });
        }

        for (const script of scripts) {
          try {
            event.sender.executeJavaScript(script, true);
          } catch (e) {
            console.error("@adb scriptlet crashed", e);
          }
        }
      } catch (e) {
        console.error("@adb inject-cosmetic-filters error", e);
      }
    });

    ipcMain.handle("@adb/is-mutation-observer-enabled", async () => {
      return true;
    });
  }

  async initializeForSession(session: Electron.Session, disabledFilters?: string[]) {
    this.session = session;
    await this.initialize(disabledFilters);

    session.registerPreloadScript({
      type: "frame",
      filePath: path.join(__dirname, "adblocker-preload.js"),
    });
  }

  enable() {
    if (!this.session || !this.engine) return;
    if (this.isEnabled) return;
    this.isEnabled = true;

    this.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
      if (!this.engine) return callback({});
      const request = Request.fromRawDetails({
        url: details.url,
        sourceUrl: details.referrer || "",
        type: (details.resourceType as any) || "other",
        requestId: `${details.id}`,
        tabId: details.webContentsId,
      });

      if (request.isMainFrame()) {
        return callback({});
      }

      const { redirect, match } = this.engine.match(request);

      if (redirect) {
        callback({ redirectURL: redirect.dataUrl });
      } else if (match) {
        callback({ cancel: true });
      } else {
        callback({});
      }
    });

    this.session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, (details, callback) => {
      if (!this.engine) return callback({});

      const CSP_HEADER_NAME = "content-security-policy";
      const policies: string[] = [];
      const responseHeaders = details.responseHeaders || {};

      if (details.resourceType === "mainFrame" || details.resourceType === "subFrame") {
        const request = Request.fromRawDetails({
          url: details.url,
          sourceUrl: details.referrer || "",
          type: (details.resourceType as any) || "other",
        });

        const rawCSP = this.engine.getCSPDirectives(request);
        if (rawCSP !== undefined) {
          policies.push(...rawCSP.split(";").map((csp) => csp.trim()));
          for (const [name, values] of Object.entries(responseHeaders)) {
            if (name.toLowerCase() === CSP_HEADER_NAME) {
              policies.push(...values);
              delete responseHeaders[name];
            }
          }
          responseHeaders[CSP_HEADER_NAME] = [policies.join(";")];
          callback({ responseHeaders });
          return;
        }
      }
      callback({});
    });

    // this.onShowADBlockRequest();
  }

  disable() {
    if (!this.session) return;
    this.isEnabled = false;

    this.session.webRequest.onBeforeRequest(null);
    this.session.webRequest.onHeadersReceived(null);
    this.unwatchAll();
  }

  injectYoutubeAdblockSponsor(webContents: WebContents) {
    this.AdblockService.injectYoutubeAdblockSponsor(webContents);
  }

  watch(webContents: WebContents) {
    if (this.watchedWebContents.has(webContents.id)) return;

    const handler = () => {
      const url = webContents.getURL();
      if (url.includes("youtube.com")) {
        this.injectYoutubeAdblockSponsor(webContents);
      }
    };

    webContents.on("did-navigate", handler);
    this.watchedWebContents.set(webContents.id, () => {
      webContents.removeListener("did-navigate", handler);
    });
  }

  unwatch(webContents: WebContents) {
    const cleanup = this.watchedWebContents.get(webContents.id);
    if (cleanup) {
      cleanup();
      this.watchedWebContents.delete(webContents.id);
    }
  }

  private unwatchAll() {
    for (const [, cleanup] of this.watchedWebContents) {
      cleanup();
    }
    this.watchedWebContents.clear();
  }

  onShowADBlockRequest() {
    if (!this.engine) return;
    this.engine.on("request-blocked", (request: Request) => {
      log.info("%crequest-blocked", request.tabId, request.url, "color: red");
    });
    this.engine.on("request-redirected", (request: Request) => {
      log.info("%crequest-redirected", request.tabId, request.url, "color: red");
    });
    this.engine.on("request-whitelisted", (request: Request) => {
      log.info("%crequest-whitelisted", request.tabId, request.url, "color: red");
    });
    this.engine.on("csp-injected", (request: Request, csps: string) => {
      log.info("%ccsp-injected", request.url, csps, "color: red");
    });
    this.engine.on("script-injected", (script: string, url: string) => {
      log.info("%cRed script-injected", script.length, url, "color: red");
    });
    this.engine.on("style-injected", (style: string, url: string) => {
      log.info("%cRed style-injected", style.length, url, "color: red");
    });
    this.engine.on("filter-matched", console.log.bind(console, "%cfilter-matched"));
  }
}
