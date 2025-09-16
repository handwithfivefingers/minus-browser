import { ElectronBlocker, fullLists, Request } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import { session, WebContentsView } from "electron";
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

export class AdBlocker {
  // blocker: CustomAds;
  blocker: ElectronBlocker;
  constructor() {
    this.initialize();
  }
  async initialize() {
    this.blocker = await ElectronBlocker.fromLists(fetch, Array.from(ALL_LISTS.values()));
  }

  setupAdvancedRequestBlocking(view: WebContentsView) {
    this.blocker.enableBlockingInSession(session.defaultSession);
    this.injectYoutubeAdblockSponsor(view);
  }

  injectYoutubeAdblockSponsor(view: WebContentsView) {
    /**
     * @todo: Script injection to Document
     * @idea
     * - Custom Plugin same as Tampermonkey
     */
    if (!view || !view.webContents) return;
    const script = [this.youtubePatchPlayer(), this.youtubeRemovePopups(), this.skipAds()];

    // Inject trực tiếp vào renderer
    if (view.webContents.getURL().includes("youtube.com")) {
      view.webContents
        .executeJavaScript(script.join("\n"))
        .then(() => {
          console.error("[YT Adblock] Successfully injected patch!");
        })
        .catch((err) => {
          console.error("[YT Adblock] Injection failed:", err);
        });
    }
  }

  youtubePatchPlayer() {
    const script = function () {
      "use strict";
      console.log("[YT Adblock] Injecting patch...");
      const origDefineProperty = Object.defineProperty;
      Object.defineProperty = function (obj, prop, desc) {
        if (prop === "ads" || prop === "ytads") {
          console.log("[YT Adblock] Blocked property injection:", prop);
          return obj;
        }
        return origDefineProperty.apply(this, arguments);
      };
      // Quan sát DOM và patch player khi có
      const observer = new MutationObserver(() => {
        const player = document.querySelector("ytd-player");
        /** @ts-ignore */
        if (player && player.player_ && typeof player.player_.getAdState === "function") {
          /** @ts-ignore */
          player.player_.getAdState = () => 0; // luôn không có ad
          console.log("[YT Adblock] Patched mid-roll ads!");
          observer.disconnect();
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    };
    return `(${script.toString()})();`;
  }

  youtubeRemovePopups() {
    const script = function () {
      "use strict";
      const removeElements = () => {
        const popupContainer = document.querySelector("ytd-popup-container");
        const overlayBackdrop = document.querySelector("tp-yt-iron-overlay-backdrop");

        if (popupContainer) {
          popupContainer.remove();
          console.log("Removed ytd-popup-container");
        }

        if (overlayBackdrop) {
          overlayBackdrop.remove();
          console.log("Removed overlay backdrop");
        }
      };
      // Run initially
      removeElements();
      // Observe and re-run when elements are reinserted
      const observer = new MutationObserver(removeElements);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    };
    return `(${script.toString()})();`;
  }

  skipAds() {
    const script = function () {
      function skipAds() {
        const pipMode = document.querySelector("ytd-pip-container, ytd-miniplayer-player-container");
        const adVideo = document.querySelector(".ad-showing video");

        /**@ts-ignore */
        if (adVideo && adVideo.duration) {
          /**@ts-ignore */
          adVideo.currentTime = adVideo.duration;
          /**@ts-ignore */
          adVideo.muted = true;
        }
        const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern");
        if (skipBtn) {
          /**@ts-ignore */
          skipBtn.click();
        }

        if (document.querySelector(".ad-showing")) {
          setTimeout(skipAds, 500);
        }
      }
      function keepVideoPlayingEarly() {
        const video = document.querySelector("video");
        if (!video || video.dataset.keepPlayingEarly) return;

        video.dataset.keepPlayingEarly = "true";

        const onPause = () => {
          if (video.currentTime <= 3) {
            video
              .play()
              .then(() => {})
              .catch((err) => {
                console.warn("[Userscript] Impossible de play :", err);
              });
          }
          video.removeEventListener("pause", onPause);
        };

        video.addEventListener("pause", onPause);
      }
      /**@ts-ignore */
      let debounceTimeout;
      const observer = new MutationObserver(() => {
        /**@ts-ignore */
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
          skipAds();
          keepVideoPlayingEarly();
        }, 100);
      });
      observer.observe(document.body, { childList: true, subtree: true });
    };

    return `(${script.toString()})();`;
  }

  onShowADBlockRequest() {
    this.blocker.on("request-blocked", (request: Request) => {
      log.info("%crequest-blocked", request.tabId, request.url, "color: red");
    });
    this.blocker.on("request-redirected", (request: Request) => {
      log.info("%crequest-redirected", request.tabId, request.url, "color: red");
    });
    this.blocker.on("request-whitelisted", (request: Request) => {
      log.info("%crequest-whitelisted", request.tabId, request.url, "color: red");
    });
    this.blocker.on("csp-injected", (request: Request, csps: string) => {
      log.info("%ccsp-injected", request.url, csps, "color: red");
    });
    this.blocker.on("script-injected", (script: string, url: string) => {
      // log.info("%cRed script-injected", script.length, url, "color: red");
    });
    this.blocker.on("style-injected", (style: string, url: string) => {
      log.info("%cRed style-injected", style.length, url, "color: red");
    });
    this.blocker.on("filter-matched", console.log.bind(console, "%cfilter-matched"));
  }
}
