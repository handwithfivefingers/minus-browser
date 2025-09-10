// import { ElectronBlocker, fullLists } from "@ghostery/adblocker-electron";
import { BlockingContext, ElectronBlocker, fullLists, Request } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import { BrowserWindow, WebContentsView } from "electron";
import log from "electron-log";
export const ALL_LISTS = new Set([
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/yt-annoyances.txt",
  "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
  "https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/ublock-origin/filters-2025.txt",
  ...fullLists,
]);

class CustomBlockingContext {
  session: Electron.Session;
  blocker: CustomAds;
  constructor(session: Electron.Session, blocker: CustomAds) {
    this.session = session;
    this.blocker = blocker;
  }
  enable() {
    this.session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, this.blocker.onHeadersReceived);
    this.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, this.blocker.onBeforeRequest);
  }
  disable() {
    this.session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, null);
    this.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, null);
  }
}

class CustomAds extends ElectronBlocker {
  newCtx = new WeakMap();
  constructor(props: any) {
    super(props);
  }

  onEnable(session: Electron.Session) {
    let ctx = this.newCtx.get(session);
    if (ctx !== undefined) {
      return ctx;
    }
    ctx = new CustomBlockingContext(session, this);
    this.newCtx.set(session, ctx);
    ctx.enable();
    return ctx;
  }
  onDisable(session: Electron.Session) {
    const ctx = this.newCtx.get(session);
    if (ctx !== undefined) {
      ctx.disable();
      this.newCtx.delete(session);
    }
  }
}
export class AdBlocker {
  blocker: CustomAds;
  constructor() {
    this.initialize();
  }
  async initialize() {
    delete CustomAds.prototype.enableBlockingInSession;
    const blocker = await CustomAds.fromLists(fetch, Array.from(ALL_LISTS.values()));
    this.blocker = blocker;
  }

  setupAdvancedRequestBlocking(view: WebContentsView) {
    this.blocker.onEnable(view.webContents.session);
    this.blocker.on("request-blocked", (request: Request) => {
      log.info("request-blocked", request.tabId, request.url);
    });
    this.blocker.on("request-redirected", (request: Request) => {
      log.info("request-redirected", request.tabId, request.url);
    });

    this.blocker.on("request-whitelisted", (request: Request) => {
      log.info("request-whitelisted", request.tabId, request.url);
    });

    this.blocker.on("csp-injected", (request: Request, csps: string) => {
      log.info("csp-injected", request.url, csps);
    });

    this.blocker.on("script-injected", (script: string, url: string) => {
      log.info("script-injected", script.length, url);
    });

    this.blocker.on("style-injected", (style: string, url: string) => {
      log.info("style-injected", style.length, url);
    });

    this.blocker.on("filter-matched", console.log.bind(console, "filter-matched"));
  }

  // enable() {
  //   // Create new blocking context for `session`
  //   const BlockingContext = new BlockingContext(session, this);
  //   BlockingContext.enable = () => {};
  //   context = new BlockingContext(session, this);
  //   this.contexts.set(session, context);
  //   context.enable();
  //   return context;
  // }

  setupViewEventHandlers(view: WebContentsView) {
    // Log blocked requests for debugging
    view.webContents.session.webRequest.onBeforeRequest((details, callback) => {
      callback({});
    });

    // Optional: Inject additional cosmetic filters
    view.webContents.on("dom-ready", () => {
      log.info("dom-ready");
    });
    view.webContents.on("page-title-updated", (event) => {
      log.info("page-title-updated");
      const url = view.webContents.getURL();
      if (!url.includes("youtube.com")) return;
      this.injectYoutubeAdblockSponsor(view);
    });
  }

  injectYoutubeAdblockSponsor(view: WebContentsView) {
    if (!view || !view.webContents) return;
    const script = `
    (function() {
      console.log("[YT Adblock] Injecting patch...");

      // Patch defineProperty để ngăn YouTube chèn ads API
      const origDefineProperty = Object.defineProperty;
      Object.defineProperty = function(obj, prop, desc) {
        if (prop === "ads" || prop === "ytads") {
          console.log("[YT Adblock] Blocked property injection:", prop);
          return obj;
        }
        return origDefineProperty.apply(this, arguments);
      };

      // Quan sát DOM và patch player khi có
      const observer = new MutationObserver(() => {
        const player = document.querySelector("ytd-player");
        if (player && player.player_ && typeof player.player_.getAdState === "function") {
          player.player_.getAdState = () => 0; // luôn không có ad
          console.log("[YT Adblock] Patched mid-roll ads!");
          observer.disconnect();
        }
      });

      observer.observe(document, { childList: true, subtree: true });
    })();
    (function () {
    'use strict';
      const removeElements = () => {
          const popupContainer = document.querySelector('ytd-popup-container');
          const overlayBackdrop = document.querySelector('tp-yt-iron-overlay-backdrop');
  
          if (popupContainer) {
              popupContainer.remove();
              console.log('Removed ytd-popup-container');
          }
  
          if (overlayBackdrop) {
              overlayBackdrop.remove();
              console.log('Removed overlay backdrop');
          }
      };
  
      // Run initially
      removeElements();
  
      // Observe and re-run when elements are reinserted
      const observer = new MutationObserver(removeElements);
  
      observer.observe(document.body, {
          childList: true,
          subtree: true
      });
    })();
    ${this.skipAds()}

  `;

    // Inject trực tiếp vào renderer
    view.webContents
      .executeJavaScript(script)
      .then(() => {
        console.error("[YT Adblock] Successfully injected patch!");
      })
      .catch((err) => {
        console.error("[YT Adblock] Injection failed:", err);
      });
  }

  skipAds() {
    return `
      function skipAds() {
        const pipMode = document.querySelector('ytd-pip-container, ytd-miniplayer-player-container');
        const adVideo = document.querySelector('.ad-showing video');
        if (adVideo && adVideo.duration) {
            adVideo.currentTime = adVideo.duration;
            adVideo.muted = true;
        }
        const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern');
        if (skipBtn) {
            skipBtn.click();
        }
 
        if (document.querySelector('.ad-showing')) {
            setTimeout(skipAds, 500);
        }
    }
    function keepVideoPlayingEarly() {
        const video = document.querySelector('video');
        if (!video || video.dataset.keepPlayingEarly) return;
 
        video.dataset.keepPlayingEarly = "true";
 
        const onPause = () => {
            if (video.currentTime <= 3) {
                video.play().then(() => {
            }).catch(err => {
                console.warn("[Userscript] Impossible de play :", err);
            });
        }
        video.removeEventListener('pause', onPause);
    };
 
    video.addEventListener('pause', onPause);
    }
 
    let debounceTimeout;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            skipAds();
            keepVideoPlayingEarly();
        }, 100);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    `;
  }
}
