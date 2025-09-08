// import { ElectronBlocker, fullLists } from "@ghostery/adblocker-electron";
// import crossFetch from "cross-fetch";
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
  "https://easylist.to/easylist/easylist.txt",
  "https://easylist.to/easylist/easyprivacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
  "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
]);

export class AdBlocker {
  blocker: AdBlocker;

  constructor() {
    // this.initializeAdBlocker();
    this.setupAdvancedRequestBlocking();
  }

  private setupAdvancedRequestBlocking() {
    const ses = session.defaultSession;
    // Block known YouTube ad domains and patterns
    const youtubeAdPatterns = [
      // Google ad services
      "googlevideo.com/videoplayback",
      "youtube.com/api/stats/ads",
      "youtube.com/ptracking",
      "youtube.com/api/stats/atr",
      "youtube.com/youtubei/v1/player/ad_break",
      "youtube.com/youtubei/v1/next",

      // Video ad patterns
      "/videoplayback?",
      "mime=video%2F",
      "oad=",
      "usg=",

      // Ad-related parameters
      "ad_break",
      "ad_video_pub_id",
      "ad_cpn",
      "ad_docid",

      // Google DoubleClick
      "doubleclick.net",
      "googlesyndication.com",
      "googletagservices.com",
      "google-analytics.com/collect",
    ];
    const onBeforeSendHeadersRequestFilter = {
      urls: ["https://*/*", "http://*/*"],
      types: ["xhr", "media", "image"],
    };
    session.defaultSession.webRequest.onBeforeSendHeaders(
      onBeforeSendHeadersRequestFilter as any,
      ({ requestHeaders, url, webContents }, callback) => {
        const urlObj = new URL(url);

        if (url.startsWith("https://www.youtube.com/youtubei/")) {
          // make InnerTube requests work with the fetch function
          // InnerTube rejects requests if the referer isn't YouTube or empty
          requestHeaders.Referer = "https://www.youtube.com/";
          requestHeaders.Origin = "https://www.youtube.com";

          requestHeaders["Sec-Fetch-Site"] = "same-origin";
          requestHeaders["Sec-Fetch-Mode"] = "same-origin";
          requestHeaders["X-Youtube-Bootstrap-Logged-In"] = "false";
        } else if (
          url === "https://www.youtube.com/sw.js_data" ||
          url.startsWith("https://www.youtube.com/api/timedtext")
        ) {
          requestHeaders.Referer = "https://www.youtube.com/sw.js";
          requestHeaders["Sec-Fetch-Site"] = "same-origin";
          requestHeaders["Sec-Fetch-Mode"] = "same-origin";
        } else if (
          urlObj.origin.endsWith(".googleusercontent.com") ||
          urlObj.origin.endsWith(".ggpht.com") ||
          urlObj.origin.endsWith(".ytimg.com")
        ) {
          requestHeaders.Referer = "https://www.youtube.com/";
          requestHeaders.Origin = "https://www.youtube.com";
        } else if (urlObj.origin.endsWith(".googlevideo.com") && urlObj.pathname === "/videoplayback") {
          requestHeaders.Referer = "https://www.youtube.com/";
          requestHeaders.Origin = "https://www.youtube.com";

          // YouTube doesn't send the Content-Type header for the media requests, so we shouldn't either
          delete requestHeaders["Content-Type"];
        }

        callback({ requestHeaders });
      }
    );

    // when we create a real session on the watch page, youtube returns tracking cookies, which we definitely don't want
    const trackingCookieRequestFilter = {
      urls: ["https://www.youtube.com/sw.js_data", "https://www.youtube.com/iframe_api"],
    };

    session.defaultSession.webRequest.onHeadersReceived(
      trackingCookieRequestFilter,
      ({ responseHeaders }, callback) => {
        if (responseHeaders) {
          delete responseHeaders["set-cookie"];
        }

        callback({ responseHeaders });
      }
    );
    ses.webRequest.onBeforeRequest((details, callback) => {
      const url = details.url.toLowerCase();

      // Check for ad patterns in YouTube requests
      if (details.url.includes("youtube.com") || details.url.includes("googlevideo.com")) {
        // Block specific ad-related requests
        const shouldBlock = youtubeAdPatterns.some((pattern) => url.includes(pattern.toLowerCase()));

        // Additional checks for video ads
        if (shouldBlock || this.isVideoAdRequest(details.url, details)) {
          console.log("🚫 Blocked YouTube ad request:", details.url);
          callback({ cancel: true });
          return;
        }
      }

      callback({});
    });

    // Modify response headers to prevent ad loading
    ses.webRequest.onHeadersReceived((details, callback) => {
      if (this.isYouTubeAdResponse(details)) {
        console.log("🚫 Blocked YouTube ad response:", details.url);
        callback({
          cancel: true,
        });
        return;
      }

      callback({});
    });
  }
  private isVideoAdRequest(url: string, details: any): boolean {
    const lowerUrl = url.toLowerCase();

    // Check for ad-specific patterns in video requests
    const adPatterns = ["ad_break", "ad_cpn", "ad_docid", "ad_video_pub_id", "adplayhead", "adsystem", "ad_type"];

    return adPatterns.some((pattern) => lowerUrl.includes(pattern));
  }
  private isYouTubeAdResponse(details: any): boolean {
    const contentType = details.responseHeaders?.["content-type"]?.[0] || "";
    const url = details.url.toLowerCase();

    // Block responses that look like video ads
    return (
      (contentType.includes("video/") || contentType.includes("application/")) &&
      (url.includes("ad_") || url.includes("doubleclick") || url.includes("googlesyndication"))
    );
  }

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
