import { app, ipcMain, WebContents, BrowserWindow, IpcMainInvokeEvent } from "electron";
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
    console.log("[AdBlocker] initialize called, disabledFilters count:", disabledFilters?.length);
    if (disabledFilters !== undefined) {
      this._disabledFilters = disabledFilters;
    }
    const key = [...this._disabledFilters].sort().join(",");
    if (this.isInitialize && this.lastDisabledKey === key) {
      console.log("[AdBlocker] initialize: already initialized with same key, skipping");
      return;
    }

    if (this.initializing) {
      console.log("[AdBlocker] initialize: waiting for pending initialization...");
      await this.initializing;
      this.initializing = undefined;
      if (this.isInitialize && this.lastDisabledKey === key) {
        console.log("[AdBlocker] initialize: already initialized after waiting, skipping");
        return;
      }
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
    console.log("[AdBlocker] load: starting engine load...");
    try {
      const cacheDir = path.join(app.getPath("userData"), "adblock-cache");
      console.log("[AdBlocker] load: cache dir =", cacheDir);
      await fs.mkdir(cacheDir, { recursive: true });

      const cacheKey = this.getCacheKey();
      const cacheKeyHash = createHash("sha256").update(cacheKey).digest("hex");
      const enginePath = path.join(cacheDir, `${cacheKeyHash}.bin`);
      const metaPath = path.join(cacheDir, `${cacheKeyHash}.meta`);

      let fromCache = false;
      try {
        const meta = JSON.parse(await fs.readFile(metaPath, "utf-8"));
        console.log("[AdBlocker] load: cache meta found, timestamp =", meta.timestamp);
        if (Date.now() - meta.timestamp < CACHE_TTL_MS) {
          const data = await fs.readFile(enginePath);
          this.engine = FiltersEngine.deserialize(new Uint8Array(data));
          fromCache = true;
          console.log("[AdBlocker] load: loaded from cache");
        } else {
          console.log("[AdBlocker] load: cache expired");
        }
      } catch {
        console.log("[AdBlocker] load: cache miss");
      }

      console.log("[AdBlocker] load: fetching metadata...");
      const metaData = await fetch(baseDir).then((res) => res.text());
      this._fullList = JSON.parse(metaData);
      console.log("[AdBlocker] load: metadata loaded,", Object.keys(this._fullList).length, "lists available");

      const customPath = path.join(app.getPath("userData"), "adblock-cache", "custom-filters.json");
      try {
        const customRaw = await fs.readFile(customPath, "utf-8");
        this._customFilters = JSON.parse(customRaw);
        console.log("[AdBlocker] load: loaded", this._customFilters.length, "custom filters from disk");
      } catch {
        console.log("[AdBlocker] load: no custom filters on disk");
      }

      if (!fromCache) {
        console.log("[AdBlocker] load: building engine from lists...");
        const disabledSet = new Set(this._disabledFilters);
        const fullLists = Object.keys(this._fullList)
          .filter((key) => !disabledSet.has(key))
          .map((key) => this._fullList[key]);

        const lists = [...fullLists];

        if (this._customFilters.length > 0) {
          lists.push(...this._customFilters);
        }

        console.log("[AdBlocker] load: fetching", lists.length, "filter lists...");
        this.engine = await FiltersEngine.fromLists(fetch, lists, {
          enableCompression: true,
          loadCosmeticFilters: true,
          loadNetworkFilters: true,
          loadCSPFilters: true,
        });
        console.log("[AdBlocker] load: engine built successfully");

        await Promise.all([
          fs.writeFile(enginePath, Buffer.from(this.engine.serialize())),
          fs.writeFile(metaPath, JSON.stringify({ timestamp: Date.now() })),
        ]);
        console.log("[AdBlocker] load: engine cached to disk");
      }

      this.isInitialize = true;
      this.registerPreloadHandlers();
      console.log("[AdBlocker] load: complete, engine ready");
    } catch (error) {
      console.error("[AdBlocker] load error", error);
    }
  }

  async clearCache() {
    console.log("[AdBlocker] clearCache: deleting cache...");
    const cacheDir = path.join(app.getPath("userData"), "adblock-cache");
    try {
      await fs.rm(cacheDir, { recursive: true, force: true });
      console.log("[AdBlocker] clearCache: deleted");
    } catch {
      console.log("[AdBlocker] clearCache: nothing to delete");
    }
    this.isInitialize = false;
    this.engine = undefined;
    await this.initialize();
    console.log("[AdBlocker] clearCache: done");
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
    console.log("[AdBlocker] setCustomFilters: saving", filters.length, "raw rules");
    this._customFilters = filters.filter((f) => f.trim() && !f.trim().startsWith("!"));
    const customPath = path.join(app.getPath("userData"), "adblock-cache", "custom-filters.json");
    await fs.mkdir(path.dirname(customPath), { recursive: true });
    await fs.writeFile(customPath, JSON.stringify(this._customFilters, null, 2));
    console.log("[AdBlocker] setCustomFilters: saved", this._customFilters.length, "rules");
  }

  async setCustomFiltersAndReload(filters: string[]) {
    console.log("[AdBlocker] setCustomFiltersAndReload...");
    await this.setCustomFilters(filters);
    this.isInitialize = false;
    await this.initialize();
    console.log("[AdBlocker] setCustomFiltersAndReload done");
  }

  async getCustomFilters(): Promise<string[]> {
    return [...this._customFilters];
  }

  startAutoUpdate(intervalMs?: number) {
    console.log("[AdBlocker] startAutoUpdate...");
    this.stopAutoUpdate();
    this.autoUpdateIntervalMs = intervalMs ?? DEFAULT_AUTO_UPDATE_INTERVAL_MS;
    console.log("[AdBlocker] startAutoUpdate: interval =", this.autoUpdateIntervalMs, "ms");
    this.autoUpdateTimer = setInterval(async () => {
      this.lastAutoUpdateCheck = Date.now();
      console.log("[AdBlocker] auto-update tick: refreshing filters...");
      this.isInitialize = false;
      await this.initialize();
      const windows = BrowserWindow.getAllWindows();
      for (const win of windows) {
        try {
          win.webContents.send("@adb/filters-updated");
          console.log("[AdBlocker] auto-update: notified window");
        } catch {
          /* window closed */
        }
      }
    }, this.autoUpdateIntervalMs);
  }

  stopAutoUpdate() {
    if (this.autoUpdateTimer) {
      console.log("[AdBlocker] stopAutoUpdate: clearing timer");
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

  private registerPreloadHandlers() {
    if (this.ipcHandlersRegistered) return;
    this.ipcHandlersRegistered = true;

    ipcMain.handle("@adb/inject-cosmetic-filters", async (event: IpcMainInvokeEvent, url: string, msg?: any) => {
      console.log("[AdBlocker] @adb/inject-cosmetic-filters", url.slice(0, 80));
      if (!this.engine || !this.isEnabled) {
        console.log("[AdBlocker] inject-cosmetic-filters skipped: engine=", !!this.engine, "enabled=", this.isEnabled);
        return;
      }

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

        if (active === false) {
          console.log("[AdBlocker] inject-cosmetic-filters: inactive");
          return;
        }

        if (styles.length > 0) {
          console.log("[AdBlocker] inject-cosmetic-filters: injecting", styles.length, "styles");
          event.sender.insertCSS(styles, { cssOrigin: "user" });
        }

        for (const script of scripts) {
          try {
            console.log("[AdBlocker] inject-cosmetic-filters: executing scriptlet");
            event.sender.executeJavaScript(script, true);
          } catch (e) {
            console.error("[AdBlocker] scriptlet crashed", e);
          }
        }
      } catch (e) {
        console.error("[AdBlocker] inject-cosmetic-filters error", e);
      }
    });

    ipcMain.handle("@adb/is-mutation-observer-enabled", async () => {
      console.log("[AdBlocker] @adb/is-mutation-observer-enabled → true");
      return true;
    });

    ipcMain.handle("@adb/is-cosmetic-filtering-enabled", async () => {
      console.log("[AdBlocker] @adb/is-cosmetic-filtering-enabled →", this.isCosmeticFilteringEnabled);
      return this.isCosmeticFilteringEnabled;
    });
  }

  getInvokeHandlers(): Record<string, (data?: any) => any> {
    return {
      "@adb/get-filter-metadata": () => {
        const count = Object.keys(this._fullList).length;
        console.log("[AdBlocker] @adb/get-filter-metadata →", count, "lists");
        return Object.entries(this._fullList).map(([key, url]) => ({
          key,
          url,
          name: filterNameFromUrl(url),
          group: filterGroupFromUrl(url),
        }));
      },
      "@adb/get-stats": () => {
        const stats = this.getStats();
        console.log("[AdBlocker] @adb/get-stats →", stats);
        return stats;
      },
      "@adb/clear-cache": async () => {
        console.log("[AdBlocker] @adb/clear-cache");
        await this.clearCache();
        console.log("[AdBlocker] @adb/clear-cache done");
        return true;
      },
      "@adb/get-cache-info": async () => {
        const info = await this.getCacheInfo();
        console.log("[AdBlocker] @adb/get-cache-info →", info);
        return info;
      },
      "@adb/get-custom-filters": async () => {
        const filters = await this.getCustomFilters();
        console.log("[AdBlocker] @adb/get-custom-filters →", filters.length, "rules");
        return filters;
      },
      "@adb/set-custom-filters": async (_data: any) => {
        const filters: string[] = _data ?? [];
        console.log("[AdBlocker] @adb/set-custom-filters →", filters.length, "rules");
        await this.setCustomFiltersAndReload(filters);
        console.log("[AdBlocker] @adb/set-custom-filters done");
        return true;
      },
      "@adb/get-auto-update-status": () => {
        const status = this.getAutoUpdateStatus();
        console.log("[AdBlocker] @adb/get-auto-update-status →", status);
        return status;
      },
      "@adb/set-auto-update": (data: any) => {
        const { enabled, intervalMs } = data || {};
        console.log("[AdBlocker] @adb/set-auto-update enabled=", enabled, "intervalMs=", intervalMs);
        if (enabled) {
          this.startAutoUpdate(intervalMs);
        } else {
          this.stopAutoUpdate();
        }
        return true;
      },
    };
  }

  injectionCosmeticFilter(event: any, url: string, msg?: any) {
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
  }

  async initializeForSession(session: Electron.Session, disabledFilters?: string[]) {
    console.log("[AdBlocker] initializeForSession");
    this.session = session;
    await this.initialize(disabledFilters);

    session.registerPreloadScript({
      type: "frame",
      filePath: path.join(__dirname, "adblocker-preload.js"),
    });
    console.log("[AdBlocker] initializeForSession: preload script registered");
  }

  enable() {
    console.log("[AdBlocker] enable called");
    if (!this.session || !this.engine) {
      console.log("[AdBlocker] enable: skipped, session=", !!this.session, "engine=", !!this.engine);
      return;
    }
    if (this.isEnabled) {
      console.log("[AdBlocker] enable: already enabled");
      return;
    }
    this.isEnabled = true;
    console.log("[AdBlocker] enable: registering webRequest handlers");
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
        console.log("[AdBlocker] blocked (redirect):", details.url.slice(0, 100));
        callback({ redirectURL: redirect.dataUrl });
      } else if (match) {
        this._blockedRequestsCount++;
        console.log("[AdBlocker] blocked (cancel):", details.url.slice(0, 100));
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
    console.log("[AdBlocker] disable called");
    this.isEnabled = false;

    if (!this.session) {
      console.log("[AdBlocker] disable: no session");
      return;
    }
    this.session.webRequest.onBeforeRequest(null);
    this.session.webRequest.onHeadersReceived(null);
    this.unwatchAll();
    console.log("[AdBlocker] disable: done");
  }

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
