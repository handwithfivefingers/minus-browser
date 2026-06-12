import { ElectronBlocker, Request } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import { app, WebContentsView } from "electron";
import log from "electron-log";
import { AdblockService } from "../services";
import fs from "node:fs";

const baseDir = `https://raw.githubusercontent.com/brave/adblock-lists-mirror/lists/lists/metadata.json`;

export class AdBlocker {
  blocker: ElectronBlocker | undefined;
  AdblockService = new AdblockService();
  isInitialize = false;
  private initializing?: Promise<void>;
  async initialize() {
    if (this.isInitialize) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.load();
    return this.initializing;
  }

  private async load() {
    try {
      const metaData = await fetch(baseDir).then((res) => res.text());
      const fullList = JSON.parse(metaData);
      const fullLists = Object.keys(fullList).map((key: string) => {
        return fullList[key];
      });
      this.blocker = await ElectronBlocker.fromLists(fetch, fullLists, {
        enableCompression: true,
      });
      this.isInitialize = true;
    } catch (error) {
      console.log("Adblocker load error", error);
    }
  }

  async setupAdvancedRequestBlocking(session: Electron.Session) {
    await this.initialize();
    this.blocker?.enableBlockingInSession(session);
  }

  injectYoutubeAdblockSponsor(webContents: WebContentsView["webContents"]) {
    this.AdblockService.injectYoutubeAdblockSponsor(webContents);
  }

  onShowADBlockRequest() {
    this.blocker?.on("request-blocked", (request: Request) => {
      log.info("%crequest-blocked", request.tabId, request.url, "color: red");
    });
    this.blocker?.on("request-redirected", (request: Request) => {
      log.info("%crequest-redirected", request.tabId, request.url, "color: red");
    });
    this.blocker?.on("request-whitelisted", (request: Request) => {
      log.info("%crequest-whitelisted", request.tabId, request.url, "color: red");
    });
    this.blocker?.on("csp-injected", (request: Request, csps: string) => {
      log.info("%ccsp-injected", request.url, csps, "color: red");
    });
    this.blocker?.on("script-injected", (script: string, url: string) => {
      log.info("%cRed script-injected", script.length, url, "color: red");
    });
    this.blocker?.on("style-injected", (style: string, url: string) => {
      log.info("%cRed style-injected", style.length, url, "color: red");
    });
    this.blocker?.on("filter-matched", console.log.bind(console, "%cfilter-matched"));
  }
  disabled(session: Electron.Session) {
    this.blocker?.disableBlockingInSession(session);
  }
}
