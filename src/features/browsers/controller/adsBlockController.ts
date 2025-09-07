import { ElectronBlocker, fullLists } from "@ghostery/adblocker-electron";
import crossFetch from "cross-fetch";
import { session, WebContentsView } from "electron";
import log from "electron-log";
import { readFileSync, writeFileSync } from "node:fs";

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
  ...fullLists,
]);

// // Helper to initialize adblocker and apply to all sessions
// async function enableAdBlocking() {
//   // Disable ad-blocking for all YouTube-related domains by skipping ad-blocker logic for these URLs
//   const youtubeDomains = ["youtube.com", "youtube-nocookie.com", "googlevideo.com"];
//   session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
//     const url = details.url;
//     if (youtubeDomains.some((domain) => url.includes(domain))) {
//       // Do nothing for YouTube, let all requests through
//       callback({ cancel: false });
//       return;
//     }
//     // Only apply ad-blocker logic for non-YouTube domains (ad-blocker initialization below)
//     callback({ cancel: false });
//   });

//   // Now, only initialize ad-blocker for non-YouTube domains
//   // (ad-blocker logic remains unchanged below)

//   try {
//     const blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(crossFetch, {
//       path: "engine.bin",
//       read: async (...args) => readFileSync(...args),
//       write: async (...args) => writeFileSync(...args),
//     });
//     blocker.enableBlockingInSession(session.defaultSession);
//     blocker.on("request-blocked", ({ url, type }) => {
//       log.info(`[adblock] Blocked: ${type} ${url}`);
//     });
//     blocker.on("request-whitelisted", ({ url }) => {
//       log.info(`[adblock] Whitelisted: ${url}`);
//     });
//     // Cosmetic filtering and scriptlets are disabled to avoid breaking YouTube.
//     // To re-enable, uncomment below:
//     // if (blocker.enableCosmeticFiltering) blocker.enableCosmeticFiltering(session.defaultSession);
//     // if (blocker.enableScriptlets) blocker.enableScriptlets(session.defaultSession);
//     log.info("Ad-blocker enabled (prebuilt lists, cosmetic/scriptlets OFF for compatibility)");
//   } catch (err) {
//     console.error("Prebuilt adblock lists failed, falling back to manual lists:", err);
//     try {
//       const blocker = await ElectronBlocker.fromLists(
//         crossFetch,
//         fullLists,
//         {
//           enableCompression: true,
//         },
//         {
//           path: "engine.bin",
//           read: async (...args) => readFileSync(...args),
//           write: async (...args) => writeFileSync(...args),
//         }
//       ); // Allow absolutely all requests to YouTube-related domains and subdomains
//       blocker.enableBlockingInSession(session.defaultSession);
//       console.log("Ad-blocker enabled (manual lists, cosmetic/scriptlets OFF for compatibility)");
//     } catch (err2) {
//       console.error("Failed to initialize ad-blocker completely:", err2);
//     }
//   }
// }

// // Aggressive ad-blocking: all lists, cosmetic filtering, scriptlets
// async function enableAggressiveAdBlocking(ses: Electron.Session) {
//   try {
//     const blocker = await ElectronBlocker.fromLists(
//       crossFetch,
//       [...ALL_LISTS.values()],
//       {
//         enableCompression: true,
//       },
//       {
//         path: "engine.bin",
//         read: async (...args) => readFileSync(...args),
//         write: async (...args) => writeFileSync(...args),
//       }
//     );
//     blocker.enableBlockingInSession(ses);
//     // if (blocker) blocker.enableCosmeticFiltering(session.defaultSession);
//     // if (blocker.enableScriptlets) blocker.enableScriptlets(session.defaultSession);
//     log.info("Aggressive ad-blocker enabled (all lists, cosmetic/scriptlets ON)");
//   } catch (err) {
//     log.error("Failed to enable aggressive ad-blocking:", err);
//   }
// }

// export { enableAdBlocking, enableAggressiveAdBlocking };

export class AdBlocker {
  blocker: ElectronBlocker | null = null;

  constructor() {
    this.initializeAdBlocker();
  }

  private async initializeAdBlocker(): Promise<void> {
    try {
      log.info("🔄 Initializing ad blocker...");
      // Create blocker once with all filter lists
      this.blocker = await ElectronBlocker.fromLists(
        crossFetch,
        [...ALL_LISTS.values()],
        {
          enableCompression: true,
          enableOptimizations: true,
          // Enable more aggressive blocking
          loadCosmeticFilters: true,
          loadNetworkFilters: true,
        },
        {
          path: "engine.bin",
          read: async (...args) => readFileSync(...args),
          write: async (...args) => writeFileSync(...args),
        }
      );
      // Enable blocking in default session
      this.blocker.enableBlockingInSession(session.defaultSession);
      this.setupAdvancedRequestBlocking();
      log.info("✅ Ad blocker initialized successfully");
      // Optional: Set up periodic updates
    } catch (error) {
      log.error("❌ Failed to initialize ad blocker:", error);
    }
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
      // This is just for logging - actual blocking is handled by ElectronBlocker
      console.log("✅ Request:", details.url);
      if (
        this.blocker?.match({
          type: details.resourceType as any,
          url: details.url,
          sourceUrl: details.referrer || "",
        } as any)
      ) {
        console.log("🚫 Blocked request:", details.url);
      }
      callback({});
    });

    // Optional: Inject additional cosmetic filters
    view.webContents.on("dom-ready", () => {
      this.injectCosmeticFilters(view);
    });
  }

  private async injectCosmeticFilters(view: WebContentsView) {
    console.log("injectCosmeticFilters");
    if (!this.blocker) return;
    try {
      const url = view.webContents.getURL();
      if (!url) return;
      // Get cosmetic filters for this domain
      const { styles } = this.blocker.getCosmeticsFilters({
        url,
        hostname: new URL(url).hostname,
        domain: new URL(url).hostname,
      });
      if (styles) {
        // Inject CSS to hide elements
        await view.webContents.insertCSS(styles);
        console.log("💅 Injected cosmetic filters for:", url);
      }
    } catch (error) {
      console.error("❌ Error injecting cosmetic filters:", error);
    }
  }

  async ensureViewHasAdBlocking(view: WebContentsView): Promise<void> {
    if (!this.blocker) {
      throw new Error("Ad blocker not initialized");
    }

    // Get the session for this view
    const viewSession = view.webContents.session;

    // Enable blocking in this specific session if it's not the default
    if (viewSession !== session.defaultSession) {
      this.blocker.enableBlockingInSession(viewSession);
    }
  }

  //   if (replaceHttpCache) {
  //     // in-memory image cache

  //     const imageCache = new ImageCache()

  //     protocol.handle('imagecache', (request) => {
  //       const [requestUrl, rawWebContentsId] = request.url.split('#')

  //       return new Promise((resolve, reject) => {
  //         const url = decodeURIComponent(requestUrl.substring(13))
  //         if (imageCache.has(url)) {
  //           const cached = imageCache.get(url)

  //           resolve(new Response(cached.data, {
  //             headers: { 'content-type': cached.mimeType }
  //           }))
  //           return
  //         }

  //         let headers

  //         if (rawWebContentsId) {
  //           const invidiousAuthorization = invidiousAuthorizations.get(parseInt(rawWebContentsId))

  //           if (invidiousAuthorization && url.startsWith(invidiousAuthorization.url)) {
  //             headers = {
  //               Authorization: invidiousAuthorization.authorization
  //             }
  //           }
  //         }

  //         const newRequest = net.request({
  //           method: request.method,
  //           url,
  //           headers
  //         })

  //         // Electron doesn't allow certain headers to be set:
  //         // https://www.electronjs.org/docs/latest/api/client-request#requestsetheadername-value
  //         // also blacklist Origin and Referrer as we don't want to let YouTube know about them
  //         const blacklistedHeaders = ['content-length', 'host', 'trailer', 'te', 'upgrade', 'cookie2', 'keep-alive', 'transfer-encoding', 'origin', 'referrer']

  //         for (const header of Object.keys(request.headers)) {
  //           if (!blacklistedHeaders.includes(header.toLowerCase())) {
  //             newRequest.setHeader(header, request.headers[header])
  //           }
  //         }

  //         newRequest.on('response', (response) => {
  //           const chunks = []
  //           response.on('data', (chunk) => {
  //             chunks.push(chunk)
  //           })

  //           response.on('end', () => {
  //             const data = Buffer.concat(chunks)

  //             const expiryTimestamp = extractExpiryTimestamp(response.headers)
  //             const mimeType = response.headers['content-type']

  //             imageCache.add(url, mimeType, data, expiryTimestamp)

  //             resolve(new Response(data, {
  //               headers: { 'content-type': mimeType }
  //             }))
  //           })

  //           response.on('error', (error) => {
  //             console.error('image cache error', error)
  //             reject(error)
  //           })
  //         })

  //         newRequest.on('error', (err) => {
  //           console.error(err)
  //         })

  //         newRequest.end()
  //       })
  //     })

  //     const imageRequestFilter = { urls: ['https://*/*', 'http://*/*'], types: ['image'] }
  //     session.defaultSession.webRequest.onBeforeRequest(imageRequestFilter, (details, callback) => {
  //       // the requests made by the imagecache:// handler to fetch the image,
  //       // are allowed through, as their resourceType is 'other'

  //       let redirectURL = `imagecache://${encodeURIComponent(details.url)}`

  //       if (details.webContents) {
  //         redirectURL += `#${details.webContents.id}`
  //       }

  //       callback({
  //         redirectURL
  //       })
  //     })

  //     // --- end of `if experimentsDisableDiskCache` ---
  //   }

  //   await createWindow()

  //   if (process.env.NODE_ENV === 'development') {
  //     try {
  //       require('vue-devtools').install()
  //     } catch (err) {
  //       console.error(err)
  //     }
  //   }

  //   if (isDebug) {
  //     mainWindow.webContents.openDevTools()
  //   }
  // })
}
