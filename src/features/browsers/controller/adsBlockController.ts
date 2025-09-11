import { ElectronBlocker, fullLists, Request } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import { ipcMain, session, WebContentsView } from "electron";
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

// class CustomBlockingContext {
//   session: Electron.Session;
//   blocker: CustomAds;
//   constructor(session: Electron.Session, blocker: CustomAds) {
//     this.session = session;
//     this.blocker = blocker;
//   }
//   enable() {
//     ipcMain.handle("@ghostery/adblocker/inject-cosmetic-filters", this.blocker.onInjectCosmeticFilters);
//     ipcMain.handle("@ghostery/adblocker/is-mutation-observer-enabled", this.blocker.onIsMutationObserverEnabled);

//     this.session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, this.blocker.onHeadersReceived);
//     this.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, this.blocker.onBeforeRequest);
//   }
//   disable() {
//     this.session.webRequest.onHeadersReceived({ urls: ["<all_urls>"] }, null);
//     this.session.webRequest.onBeforeRequest({ urls: ["<all_urls>"] }, null);
//   }
// }

// class CustomAds extends ElectronBlocker {
//   newCtx = new WeakMap();
//   constructor(props: any) {
//     super(props);
//   }

//   onEnable(session: Electron.Session) {
//     let ctx = this.newCtx.get(session);
//     if (ctx !== undefined) {
//       return ctx;
//     }
//     ctx = new CustomBlockingContext(session, this);
//     this.newCtx.set(session, ctx);
//     ctx.enable();
//     return ctx;
//   }
//   onDisable(session: Electron.Session) {
//     const ctx = this.newCtx.get(session);
//     if (ctx !== undefined) {
//       ctx.disable();
//       this.newCtx.delete(session);
//     }
//   }
// }
export class AdBlocker {
  // blocker: CustomAds;
  blocker: ElectronBlocker;
  constructor() {
    this.initialize();
  }
  async initialize() {
    // delete CustomAds.prototype.enableBlockingInSession;
    // CustomAds.fromLists(fetch, Array.from(ALL_LISTS.values())).then((blocker) => {
    //   this.blocker = blocker;
    // });

    this.blocker = await ElectronBlocker.fromLists(fetch, Array.from(ALL_LISTS.values()));
  }

  setupAdvancedRequestBlocking(view: WebContentsView) {
    // this.blocker.onEnable(view.webContents.session);
    this.blocker.enableBlockingInSession(session.defaultSession);
    // this.blocker.on("request-blocked", (request: Request) => {
    //   log.info("%crequest-blocked", request.tabId, request.url);
    // });
    // this.blocker.on("request-redirected", (request: Request) => {
    //   log.info("%crequest-redirected", request.tabId, request.url);
    // });

    // this.blocker.on("request-whitelisted", (request: Request) => {
    //   log.info("%crequest-whitelisted", request.tabId, request.url);
    // });

    // this.blocker.on("csp-injected", (request: Request, csps: string) => {
    //   log.info("%ccsp-injected", request.url, csps);
    // });

    // this.blocker.on("script-injected", (script: string, url: string) => {
    //   // log.info("%cRed script-injected", script.length, url, "color: red");

    // });

    // this.blocker.on("style-injected", (style: string, url: string) => {
    //   log.info("%cRed style-injected", style.length, url);
    // });

    // this.blocker.on("filter-matched", console.log.bind(console, "%cfilter-matched"));
  }

  injectYoutubeAdblockSponsor(view: WebContentsView) {
    /**
     * @todo: Script injection to Document
     * @idea
     * - Custom Plugin same as Tampermonkey
     */
    if (!view || !view.webContents) return;
    const script = `${this.skipAds()}`;

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
