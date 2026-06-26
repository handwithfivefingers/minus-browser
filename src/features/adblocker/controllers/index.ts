import { app, ipcMain, WebContents } from "electron";
import { FiltersEngine, Request } from "@ghostery/adblocker";
import fetch from "cross-fetch";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AdblockService } from "../services";
import { parse } from "tldts-experimental";
import { userScriptController } from "~/features/userscript/controllers";
// import { SkipADSBlock, SponsorBlock } from "../scripts";

const baseDir = `https://raw.githubusercontent.com/brave/adblock-lists-mirror/lists/lists/metadata.json`;
const CACHE_TTL_MS = 86_400_000; // 24 hours

function filterNameFromUrl(url: string): string {
  const path = url.replace("https://raw.githubusercontent.com/", "").replace("https://", "");
  const parts = path.replace(".txt", "").split("/");
  const file = parts[parts.length - 1]
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const repo = parts.length > 1 ? parts[0] : "";
  if (repo.match(/^(easylist|fanboy|adguard|ublockorigin|brave)/i)) {
    const prefix = repo.charAt(0).toUpperCase() + repo.slice(1).replace(/origin/i, "Origin");
    return `${prefix} - ${file}`;
  }
  return file;
}

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
  isCosmeticFilteringEnabled = true;
  private _fullList: Record<string, string> = {};

  getFilterMetadata() {
    return Object.entries(this._fullList).map(([key, url]) => ({
      key,
      url,
      name: filterNameFromUrl(url),
    }));
  }

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

  private getCacheKey(): string {
    return [...this._disabledFilters].sort().join(",");
  }

  private async load() {
    try {
      const cacheDir = path.join(app.getPath("userData"), "adblock-cache");
      await fs.mkdir(cacheDir, { recursive: true });

      const cacheKey = this.getCacheKey();
      const cacheKeyHash = createHash("sha256").update(cacheKey).digest("hex");
      const enginePath = path.join(cacheDir, `${cacheKeyHash}.bin`);
      const metaPath = path.join(cacheDir, `${cacheKeyHash}.meta`);

      let fromCache = false;
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
        if (Date.now() - meta.timestamp < CACHE_TTL_MS) {
          const data = await fs.readFile(enginePath);
          this.engine = FiltersEngine.deserialize(new Uint8Array(data));
          fromCache = true;
        }
      } catch {
        /* cache miss */
      }

      const metaData = await fetch(baseDir).then((res) => res.text());
      this._fullList = JSON.parse(metaData);

      if (!fromCache) {
        const disabledSet = new Set(this._disabledFilters);
        const fullLists = Object.keys(this._fullList)
          .filter((key) => !disabledSet.has(key))
          .map((key) => this._fullList[key]);

        this.engine = await FiltersEngine.fromLists(fetch, fullLists, {
          enableCompression: true,
          loadCosmeticFilters: true,
          loadNetworkFilters: true,
          loadCSPFilters: true,
        });

        await Promise.all([
          fs.writeFile(enginePath, Buffer.from(this.engine.serialize())),
          fs.writeFile(metaPath, JSON.stringify({ timestamp: Date.now() })),
        ]);
      }

      this.isInitialize = true;
      this.registerIPCHandlers();
    } catch (error) {
      console.error("Adblocker load error", error);
    }
  }

  private registerIPCHandlers() {
    if (this.ipcHandlersRegistered) return;
    this.ipcHandlersRegistered = true;

    ipcMain.handle("@adb/inject-cosmetic-filters", async (event, url: string, msg?: any) => {
      if (!this.engine || !this.isEnabled) return;

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

    ipcMain.handle("@adb/is-cosmetic-filtering-enabled", async () => {
      return this.isCosmeticFilteringEnabled;
    });

    ipcMain.handle("@adb/get-filter-metadata", async () => {
      return Object.entries(this._fullList).map(([key, url]) => ({
        key,
        url,
        name: filterNameFromUrl(url),
      }));
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

    // Enable built-in YouTube scripts when adblock is turned on
    userScriptController.setBuiltInEnabled("builtin-skip-adsblock", true);
    userScriptController.setBuiltInEnabled("builtin-sponsorblock", true);

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
    this.isEnabled = false;

    // Disable built-in YouTube scripts when adblock is turned off
    userScriptController.setBuiltInEnabled("builtin-skip-adsblock", false);
    userScriptController.setBuiltInEnabled("builtin-sponsorblock", false);

    if (!this.session) return;
    this.session.webRequest.onBeforeRequest(null);
    this.session.webRequest.onHeadersReceived(null);
    this.unwatchAll();
  }

  // injectYoutubeAdblockSponsor(webContents: WebContents) {
  //   if (!this.isEnabled) return;
  //   webContents.executeJavaScript(`
  //     if (!window.__ytAdblockInjected) {
  //       window.__ytAdblockInjected = true;
  //       (${SponsorBlock.toString()})();
  //       (${SkipADSBlock.toString()})();
  //     }
  //   `).catch((err) => {
  //     console.error("[YT Adblock] Injection failed:", err);
  //   });
  // }

  watch(webContents: WebContents) {
    if (!this.isEnabled) return;
    if (this.watchedWebContents.has(webContents.id)) return;

    const handler = () => {
      if (!this.isEnabled) return;
      const url = webContents.getURL();
      if (url.includes("youtube.com")) {
        // this.injectYoutubeAdblockSponsor(webContents);
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
  }
}
