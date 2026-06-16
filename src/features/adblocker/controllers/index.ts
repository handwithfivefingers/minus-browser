import { FiltersEngine, Request } from "@ghostery/adblocker";
import fetch from "cross-fetch";
import { app, WebContentsView } from "electron";
import log from "electron-log";
import { AdblockService } from "../services";
import fs from "node:fs/promises";
import path from "node:path";

const baseDir = `https://raw.githubusercontent.com/brave/adblock-lists-mirror/lists/lists/metadata.json`;

export class AdBlocker {
  engine: FiltersEngine | undefined;
  AdblockService = new AdblockService();
  isInitialize = false;
  private initializing?: Promise<void>;
  private activeSessions = new Set<Electron.Session>();

  async initialize() {
    if (this.isInitialize) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.load();
    return this.initializing;
  }

  private getCachePath() {
    return path.join(app.getPath("userData"), "adblock-cache.bin");
  }

  private async load() {
    try {
      const metaData = await fetch(baseDir).then((res) => res.text());
      const fullList = JSON.parse(metaData);
      const fullLists = Object.keys(fullList).map((key: string) => {
        return fullList[key];
      });

      const cachePath = this.getCachePath();
      const caching = {
        path: cachePath,
        read: (p: string) => fs.readFile(p),
        write: (p: string, buf: Uint8Array) => fs.writeFile(p, buf),
      };

      this.engine = await FiltersEngine.fromLists(fetch, fullLists, {
        enableCompression: true,
        loadCosmeticFilters: true,
        loadNetworkFilters: true,
        loadCSPFilters: true,
      }, caching);
      this.isInitialize = true;
    } catch (error) {
      console.log("Adblocker load error", error);
    }
  }

  async setupAdvancedRequestBlocking(session: Electron.Session) {
    await this.initialize();
    if (!this.engine) return;
    if (this.activeSessions.has(session)) return;
    this.activeSessions.add(session);

    session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, (details, callback) => {
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

    session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, (details, callback) => {
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
  }

  async injectCosmeticFilters(webContents: Electron.WebContents, url: string) {
    if (!this.engine) return;

    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname;
      const domain = hostname.split(".").slice(-2).join(".");

      const result = this.engine.getCosmeticsFilters({
        url,
        hostname,
        domain,
        getBaseRules: true,
        getInjectionRules: true,
        getExtendedRules: false,
        getRulesFromDOM: false,
        getRulesFromHostname: true,
      });

      if (result.active === false) return;

      if (result.styles.length > 0) {
        webContents.insertCSS(result.styles, { cssOrigin: "user" });
      }

      for (const script of result.scripts) {
        try {
          webContents.executeJavaScript(script);
        } catch (e) {
          console.error("Scriptlet injection failed", e);
        }
      }
    } catch (e) {
      console.error("Cosmetic filter injection error", e);
    }
  }

  injectYoutubeAdblockSponsor(webContents: WebContentsView["webContents"]) {
    this.AdblockService.injectYoutubeAdblockSponsor(webContents);
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

  disabled(session: Electron.Session) {
    this.activeSessions.delete(session);
    session.webRequest.onBeforeRequest(null);
    session.webRequest.onHeadersReceived(null);
  }
}
