import { app, ipcMain, WebContents, BrowserWindow } from "electron";
import { FiltersEngine, Request } from "@ghostery/adblocker";
import fetch from "cross-fetch";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { AdblockService } from "../services";
import { parse } from "tldts-experimental";

const baseDir = `https://raw.githubusercontent.com/brave/adblock-lists-mirror/lists/lists/metadata.json`;
const CACHE_TTL_MS = 86_400_000; // 24 hours
const DEFAULT_AUTO_UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function filterNameFromUrl(url: string): string {
  const p = url.replace("https://raw.githubusercontent.com/", "").replace("https://", "");
  const parts = p.replace(".txt", "").split("/");
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

function filterGroupFromUrl(url: string): string {
  const p = url.replace("https://raw.githubusercontent.com/", "").replace("https://", "");
  const parts = p.split("/");
  const repo = parts[0] || "";
  if (repo.match(/^easylist/i)) return "EasyList";
  if (repo.match(/^adguard/i)) return "AdGuard";
  if (repo.match(/^ublockorigin/i)) return "uBlock Origin";
  if (repo.match(/^brave/i)) return "Brave";
  if (repo.match(/^fanboy/i)) return "FanBoy";
  if (url.includes("annoyance") || url.includes("annoying")) return "Annoyances";
  if (url.includes("privacy") || url.includes("tracking") || url.includes("tracker")) return "Privacy";
  if (url.includes("youtube") || url.includes("yt-")) return "YouTube";
  if (url.includes("cookie")) return "Cookies";
  if (url.includes("malware") || url.includes("security") || url.includes("phishing")) return "Security";
  if (url.includes("social")) return "Social";
  if (repo) return repo.charAt(0).toUpperCase() + repo.slice(1);
  return "Other";
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

  private autoUpdateTimer: ReturnType<typeof setInterval> | null = null;
  private autoUpdateIntervalMs = DEFAULT_AUTO_UPDATE_INTERVAL_MS;
  private lastAutoUpdateCheck = 0;
  private _blockedRequestsCount = 0;
  private _customFilters: string[] = [];

  getFilterMetadata() {
    return Object.entries(this._fullList).map(([key, url]) => ({
      key,
      url,
      name: filterNameFromUrl(url),
      group: filterGroupFromUrl(url),
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
    const parts = [...this._disabledFilters].sort();
    if (this._customFilters.length > 0) {
      const customHash = createHash("sha256").update(this._customFilters.join("\n")).digest("hex").slice(0, 12);
      parts.push(`custom:${customHash}`);
    }
    return parts.join(",");
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

      const customPath = path.join(app.getPath("userData"), "adblock-cache", "custom-filters.json");
      try {
        const customRaw = await fs.readFile(customPath, "utf-8");
        this._customFilters = JSON.parse(customRaw);
      } catch {
        /* no custom filters */
      }

      if (!fromCache) {
        const disabledSet = new Set(this._disabledFilters);
        const fullLists = Object.keys(this._fullList)
          .filter((key) => !disabledSet.has(key))
          .map((key) => this._fullList[key]);

        const lists = [...fullLists];

        if (this._customFilters.length > 0) {
          lists.push(...this._customFilters);
        }

        this.engine = await FiltersEngine.fromLists(fetch, lists, {
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

  async clearCache() {
    const cacheDir = path.join(app.getPath("userData"), "adblock-cache");
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    this.isInitialize = false;
    this.engine = undefined;
    await this.initialize();
  }

  async getCacheInfo() {
    const cacheDir = path.join(app.getPath("userData"), "adblock-cache");
    let size = 0;
    let timestamp = 0;
    try {
      await fs.mkdir(cacheDir, { recursive: true });
      const entries = await fs.readdir(cacheDir);
      for (const entry of entries) {
        if (entry.endsWith(".bin")) {
          const stat = await fs.stat(path.join(cacheDir, entry));
          size += stat.size;
        }
        if (entry.endsWith(".meta")) {
          try {
            const meta = JSON.parse(await fs.readFile(path.join(cacheDir, entry), "utf-8"));
            if (meta.timestamp > timestamp) timestamp = meta.timestamp;
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* cache dir not found */
    }
    return { size, timestamp, filterCount: Object.keys(this._fullList).length };
  }

  async setCustomFilters(filters: string[]) {
    this._customFilters = filters.filter((f) => f.trim() && !f.trim().startsWith("!"));
    const customPath = path.join(app.getPath("userData"), "adblock-cache", "custom-filters.json");
    await fs.mkdir(path.dirname(customPath), { recursive: true });
    await fs.writeFile(customPath, JSON.stringify(this._customFilters, null, 2));
  }

  async setCustomFiltersAndReload(filters: string[]) {
    await this.setCustomFilters(filters);
    this.isInitialize = false;
    await this.initialize();
  }

  async getCustomFilters(): Promise<string[]> {
    return [...this._customFilters];
  }

  startAutoUpdate(intervalMs?: number) {
    this.stopAutoUpdate();
    this.autoUpdateIntervalMs = intervalMs ?? DEFAULT_AUTO_UPDATE_INTERVAL_MS;
    this.autoUpdateTimer = setInterval(async () => {
      this.lastAutoUpdateCheck = Date.now();
      console.debug("[AdBlocker] Auto-updating filter lists...");
      this.isInitialize = false;
      await this.initialize();
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          win.webContents.send("@adb/filters-updated");
        } catch {
          /* window closed */
        }
      }
    }, this.autoUpdateIntervalMs);
  }

  stopAutoUpdate() {
    if (this.autoUpdateTimer) {
      clearInterval(this.autoUpdateTimer);
      this.autoUpdateTimer = null;
    }
  }

  getAutoUpdateStatus() {
    return {
      enabled: this.autoUpdateTimer !== null,
      intervalMs: this.autoUpdateIntervalMs,
      lastCheck: this.lastAutoUpdateCheck,
    };
  }

  getStats() {
    return {
      blockedRequests: this._blockedRequestsCount,
    };
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
        group: filterGroupFromUrl(url),
      }));
    });

    ipcMain.handle("@adb/get-stats", async () => {
      return this.getStats();
    });

    ipcMain.handle("@adb/clear-cache", async () => {
      await this.clearCache();
      return true;
    });

    ipcMain.handle("@adb/get-cache-info", async () => {
      return this.getCacheInfo();
    });

    ipcMain.handle("@adb/get-custom-filters", async () => {
      return this.getCustomFilters();
    });

    ipcMain.handle("@adb/set-custom-filters", async (_event, filters: string[]) => {
      await this.setCustomFiltersAndReload(filters);
      return true;
    });

    ipcMain.handle("@adb/get-auto-update-status", async () => {
      return this.getAutoUpdateStatus();
    });

    ipcMain.handle("@adb/set-auto-update", async (_event, enabled: boolean, intervalMs?: number) => {
      if (enabled) {
        this.startAutoUpdate(intervalMs);
      } else {
        this.stopAutoUpdate();
      }
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

    // Enable built-in YouTube scripts when adblock is turned on
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
        this._blockedRequestsCount++;
        callback({ redirectURL: redirect.dataUrl });
      } else if (match) {
        this._blockedRequestsCount++;
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
