// @ts-nocheck
import { ElectronBlocker, fullLists, Request } from "@ghostery/adblocker-electron";
import fetch from "cross-fetch";
import { session, WebContentsView } from "electron";
import log from "electron-log";
import fs, { readFileSync, writeFileSync } from "node:fs";
// export const ALL_LISTS = new Set([
//   "https://easylist.to/easylist/easylist.txt",
//   "https://easylist.to/easylist/easyprivacy.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt",
//   "https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/yt-annoyances.txt",
//   "https://adguardteam.github.io/AdGuardSDNSFilter/Filters/filter.txt",
//   "https://raw.githubusercontent.com/ghostery/adblocker/master/packages/adblocker/assets/ublock-origin/filters-2025.txt",
//   ...fullLists,
// ]);

const SkipADSBlock = () => {
  console.log("SkipADSBlock start initializing ...");

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
  function keepVideoPlayingEarly() {}
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

const SponsorBlock = () => {
  const GM_getValue = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key)) || fallback;
    } catch {
      return null;
    }
  };
  const GM_setValue = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };
  const GM_addStyle = (css) => {
    const style = document.createElement("style");
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  };

  console.log("SponsorBlock start initializing ...");

  ("use strict");

  // ═══════════════════════════════════════════════════════════════════════════
  // LAYER 0 — InnerTube patch (document-start, zero cost)
  // Wipes adPlacements before YouTube even schedules them.
  // ═══════════════════════════════════════════════════════════════════════════
  (function patchYT() {
    // Intercept adPlacements on any object
    try {
      Object.defineProperty(Object.prototype, "adPlacements", {
        get() {
          return undefined;
        },
        set(v) {
          Object.defineProperty(this, "adPlacements", {
            value: [],
            writable: true,
            configurable: true,
            enumerable: true,
          });
        },
        configurable: true,
      });
    } catch (_) {}

    // Intercept ytInitialPlayerResponse
    try {
      let _yipr;
      Object.defineProperty(window, "ytInitialPlayerResponse", {
        get() {
          return _yipr;
        },
        set(v) {
          if (v) {
            if (v.adPlacements) v.adPlacements = [];
            if (v.auxiliaryUi?.messageRenderers) {
              try {
                v.auxiliaryUi.messageRenderers.enforcementMessageViewModel = undefined;
              } catch {}
            }
          }
          _yipr = v;
        },
        configurable: true,
      });
    } catch (_) {}
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // AD CSS — hide ad elements instantly, no JS cost
  // ═══════════════════════════════════════════════════════════════════════════
  (function injectAdCSS() {
    const style = document.createElement("style");
    style.textContent = `
        ytd-action-companion-ad-renderer, ytd-display-ad-renderer,
        ytd-video-masthead-ad-v3-renderer, ytd-overlay-ad-renderer,
        ytd-promoted-sparkles-web-renderer, ytd-promoted-video-renderer,
        ytd-search-pyv-renderer, ytd-ad-slot-renderer, yt-about-this-ad-renderer,
        .ytd-banner-promo-renderer, #masthead-ad, ytd-mealbar-promo-renderer,
        tp-yt-paper-dialog:has(ytd-mealbar-promo-renderer),
        ytd-in-feed-ad-layout-renderer, ytd-statement-banner-renderer,
        #player-ads, .ytd-ad-slot-renderer,
        ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
        .ytp-ce-element, .ytp-cards-teaser
        { display: none !important; }

        .ytp-ad-text-overlay, .ytp-ad-timed-pie-countdown-container,
        .ytp-ad-image-overlay
        { visibility: hidden !important; opacity: 0 !important; }
    `;
    (document.head || document.documentElement).appendChild(style);
  })();

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG
  // ═══════════════════════════════════════════════════════════════════════════
  const CFG = {
    version: "4.0.0",
    sbApi: "https://sponsor.ajay.app/api/skipSegments",
    sbCats: [
      "sponsor",
      "selfpromo",
      "interaction",
      "intro",
      "outro",
      "preview",
      "music_offtopic",
      "filler",
      "exclusive_access",
    ],
    sbTypes: ["skip", "mute"],
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════
  const S = {
    adEnabled: GM_getValue("et4_ad", true),
    sbEnabled: GM_getValue("et4_sb", true),
    qualityEnabled: GM_getValue("et4_quality", true),

    adCount: 0,
    sbCount: 0,

    adSpeedActive: false,
    prevVolume: 1,

    sbSegments: [],
    sbVideoId: null,
    sbMutedSeg: null,

    lastUrl: location.href,
    videoId: null,

    // Performance: cache DOM nodes
    _player: null,
    _video: null,
  };

  function save(key, val) {
    GM_setValue(key, val);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOM HELPERS — cached, low GC pressure
  // ═══════════════════════════════════════════════════════════════════════════
  function getPlayer() {
    if (S._player && S._player.isConnected) return S._player;
    S._player = document.getElementById("movie_player");
    return S._player;
  }

  function getVideo() {
    if (S._video && S._video.isConnected) return S._video;
    const p = getPlayer();
    S._video = p ? p.querySelector("video") : document.querySelector("video");
    return S._video;
  }

  // Single classList check — much faster than querySelectorAll for hot path
  function isAdPlaying() {
    const p = getPlayer();
    if (!p) return false;
    // Check player class (fastest)
    if (p.classList.contains("ad-showing") || p.classList.contains("ad-interrupting")) return true;
    // Check countdown badge (reliable indicator)
    return !!(
      p.querySelector(".ytp-ad-countdown") ||
      p.querySelector(".ytp-ad-simple-ad-badge") ||
      p.querySelector(".ytp-ad-persistent-progress-bar-container")
    );
  }

  const SKIP_SELECTORS = [
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-ad-skip-button-slot button",
    'button[class*="skip-ad"]',
    '[id*="skip-button"] button',
  ];

  function getSkipBtn() {
    const p = getPlayer();
    if (!p) return null;
    for (const sel of SKIP_SELECTORS) {
      const btn = p.querySelector(sel);
      if (btn && btn.offsetParent !== null) return btn;
    }
    return null;
  }

  function fireClick(el) {
    el.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AD ENGINE — debounced, low CPU
  // ═══════════════════════════════════════════════════════════════════════════
  let _skipRaf = false;

  function trySkipAd() {
    if (!S.adEnabled || _skipRaf) return;
    _skipRaf = true;
    // Defer to next frame — batches rapid MutationObserver calls
    requestAnimationFrame(() => {
      _skipRaf = false;
      _doSkip();
    });
  }

  function _doSkip() {
    const video = getVideo();

    // 1. Skippable ad — seek to end, then click
    const btn = getSkipBtn();
    if (btn) {
      if (video && isFinite(video.duration) && video.duration > 0) {
        video.currentTime = video.duration - 0.1;
      }
      fireClick(btn);
      btn.click();
      if (video) {
        video.playbackRate = 1;
        video.muted = false;
      }
      S.adSpeedActive = false;
      S.adCount++;
      uiSync();
      toast("🚫 Ad skipped!", "#e53935");
      return;
    }

    const adActive = isAdPlaying();

    // 2. Unskippable — 16x speed
    if (video && adActive && !S.adSpeedActive) {
      S.adSpeedActive = true;
      S.prevVolume = video.volume;
      video.playbackRate = 16;
      video.muted = true;
      toast("⚡ Ad 16×…", "#ff6f00");
    }

    // 3. Restore after ad ends
    if (video && !adActive && S.adSpeedActive) {
      video.playbackRate = 1;
      video.muted = false;
      video.volume = S.prevVolume;
      S.adSpeedActive = false;
    }

    // 4. Overlay close buttons
    const p = getPlayer();
    if (p) {
      p.querySelectorAll(".ytp-ad-overlay-close-button, .ytp-ad-overlay-slot-close-button").forEach((b) => {
        try {
          b.click();
        } catch {}
      });
    }

    // 5. Enforcement popup
    dismissEnforcement();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ENFORCEMENT DISMISSAL — runs on a slow timer, not hot path
  // ═══════════════════════════════════════════════════════════════════════════
  const ENFORCEMENT_SELS = [
    "ytd-enforcement-message-view-model",
    "yt-playability-error-supported-renderers",
    '[id="enforcement-message"]',
    "yt-player-error-message-renderer",
  ];

  function dismissEnforcement() {
    for (const sel of ENFORCEMENT_SELS) {
      const modal = document.querySelector(sel);
      if (!modal) continue;
      const btn = modal.querySelector("yt-button-shape button, button");
      if (btn) {
        try {
          btn.click();
        } catch {}
      } else {
        const wrap = modal.closest("tp-yt-paper-dialog, ytd-popup-container");
        if (wrap) wrap.remove();
        else modal.remove();
      }
    }

    // Patch yt config flags
    try {
      const popup = window.yt?.config_?.openPopupConfig?.supportedPopups;
      if (popup?.adBlockMessageViewModel !== undefined) popup.adBlockMessageViewModel = false;
    } catch {}
    try {
      const d = window.ytcfg?.data_?.PLAYER_VARS;
      if (d) d.ad3_module = "0";
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // OBSERVER — targeted, filtered, low CPU
  // ═══════════════════════════════════════════════════════════════════════════
  let _adObserver = null;
  let _bodyObserver = null;

  function setupObservers() {
    if (_adObserver) {
      _adObserver.disconnect();
      _adObserver = null;
    }
    if (_bodyObserver) {
      _bodyObserver.disconnect();
      _bodyObserver = null;
    }

    // Wait for player
    let tries = 0;
    const wait = setInterval(() => {
      const player = getPlayer();
      if (!player && ++tries < 40) return;
      clearInterval(wait);
      if (!player) return;

      // Player observer — only watch class changes (ad-showing is a class toggle)
      _adObserver = new MutationObserver((mutations) => {
        if (!S.adEnabled) return;
        for (const m of mutations) {
          if (m.type === "attributes" || m.addedNodes.length) {
            trySkipAd();
            return;
          }
        }
      });
      _adObserver.observe(player, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      });

      // Body observer — only watch for enforcement modal injection
      _bodyObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            if (node.nodeType !== 1) continue;
            if (
              node.tagName?.includes("ENFORCEMENT") ||
              node.id?.includes("enforcement") ||
              node.querySelector?.("ytd-enforcement-message-view-model")
            ) {
              setTimeout(dismissEnforcement, 80);
              return;
            }
          }
        }
      });
      _bodyObserver.observe(document.body, { childList: true, subtree: false });
    }, 300);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FALLBACK — slow interval, only fires when needed
  // ═══════════════════════════════════════════════════════════════════════════
  setInterval(() => {
    if (S.adEnabled) _doSkip();
    dismissEnforcement();
  }, 800);

  setInterval(dismissEnforcement, 2000);

  // ═══════════════════════════════════════════════════════════════════════════
  // SPONSORBLOCK
  // ═══════════════════════════════════════════════════════════════════════════
  async function sha256Prefix(str) {
    try {
      const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 4);
    } catch {
      return null;
    }
  }

  function fetchSB(videoId) {
    if (!S.sbEnabled || !videoId || videoId === S.sbVideoId) return;
    S.sbVideoId = videoId;
    S.sbSegments = [];

    const cats = CFG.sbCats.map((c) => `&category=${c}`).join("");
    const types = CFG.sbTypes.map((t) => `&actionType=${t}`).join("");

    function parseSegments(text) {
      try {
        const data = JSON.parse(text);
        let segs = [];
        if (Array.isArray(data) && data[0]?.segments) {
          const match = data.find((d) => d.videoID === videoId);
          segs = match?.segments || [];
        } else if (Array.isArray(data) && data[0]?.segment) {
          segs = data;
        }
        S.sbSegments = segs.map((s) => ({
          start: s.segment[0],
          end: s.segment[1],
          cat: s.category,
          actionType: s.actionType || "skip",
          uuid: s.UUID,
        }));
      } catch {
        S.sbSegments = [];
      }
    }

    sha256Prefix(videoId).then((prefix) => {
      const hashUrl = prefix ? `https://sponsor.ajay.app/api/skipSegments/${prefix}?${cats.slice(1)}${types}` : null;
      const directUrl = `${CFG.sbApi}?videoID=${videoId}${cats}${types}`;

      GM_xmlhttpRequest({
        method: "GET",
        url: hashUrl || directUrl,
        onload(r) {
          if (r.status === 200) {
            parseSegments(r.responseText);
            return;
          }
          if (hashUrl)
            GM_xmlhttpRequest({
              method: "GET",
              url: directUrl,
              onload(r2) {
                if (r2.status === 200) parseSegments(r2.responseText);
              },
              onerror() {},
            });
        },
        onerror() {
          if (hashUrl)
            GM_xmlhttpRequest({
              method: "GET",
              url: directUrl,
              onload(r2) {
                if (r2.status === 200) parseSegments(r2.responseText);
              },
              onerror() {},
            });
        },
      });
    });
  }

  // SponsorBlock check — runs on rAF, not interval
  let _sbLast = 0;
  function checkSB(ts) {
    if (ts - _sbLast >= 400) {
      _sbLast = ts;
      _doCheckSB();
    }
    requestAnimationFrame(checkSB);
  }

  function _doCheckSB() {
    if (!S.sbEnabled || !S.sbSegments.length) return;
    const video = getVideo();
    if (!video || video.paused) return;
    const t = video.currentTime;

    for (const seg of S.sbSegments) {
      const inSeg = t >= seg.start && t < seg.end - 0.1;
      if (seg.actionType === "mute") {
        if (inSeg) {
          if (S.sbMutedSeg !== seg.uuid) {
            S.sbMutedSeg = seg.uuid;
            video.muted = true;
            S.sbCount++;
            uiSync();
            toast(`🔇 SB: [${seg.cat}]`, "#7b1fa2");
          }
        } else if (S.sbMutedSeg === seg.uuid) {
          video.muted = false;
          S.sbMutedSeg = null;
        }
      } else if (inSeg) {
        video.currentTime = seg.end;
        S.sbCount++;
        uiSync();
        toast(`⏭ SB: [${seg.cat}]`, "#1a73e8");
        break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO QUALITY
  // ═══════════════════════════════════════════════════════════════════════════
  const QUALITY_LABELS = {
    highres: "8K",
    hd2160: "4K 2160p",
    hd1440: "1440p",
    hd1080: "1080p HD",
    hd720: "720p HD",
    large: "480p",
    medium: "360p",
    small: "240p",
  };

  function setQuality() {
    if (!S.qualityEnabled) return;
    try {
      const player = getPlayer();
      if (!player?.getAvailableQualityLevels) return;
      const levels = player.getAvailableQualityLevels();
      if (!levels?.length) return;
      const best = levels[0];
      if (player.getPlaybackQuality() !== best) {
        player.setPlaybackQualityRange(best, best);
        player.setPlaybackQuality(best);
        toast(`✨ Quality: ${QUALITY_LABELS[best] || best}`, "#e53935");
      }
    } catch {}
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DOWNLOAD — evdfrance.fr (fast, no Cobalt timeout lag)
  // ═══════════════════════════════════════════════════════════════════════════
  function downloadVideo(videoId) {
    if (!videoId) return;
    toast("⬇ Opening download…", "#1565c0");
    window.open(`https://evdfrance.fr/convert/?id=${videoId}`, "_blank");
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NAVIGATION
  // ═══════════════════════════════════════════════════════════════════════════
  function getVideoId(url = location.href) {
    return (
      url.match(/[?&]v=([^&#]{11})/)?.[1] ||
      url.match(/shorts\/([^?&#]{11})/)?.[1] ||
      url.match(/youtu\.be\/([^?&#]{11})/)?.[1] ||
      null
    );
  }

  function getTitle() {
    const sel = [
      "ytd-watch-metadata h1 yt-formatted-string",
      "#title h1 yt-formatted-string",
      'h2 span.yt-core-attributed-string[role="text"]',
      ".title.ytd-video-primary-info-renderer",
    ];
    for (const s of sel) {
      const t = document.querySelector(s)?.textContent?.trim();
      if (t?.length > 1) return t;
    }
    return document.title?.replace(/\s*[-|]\s*YouTube\s*$/i, "").trim() || "EasyTube";
  }

  let _navTimer = null;
  function onNavigate() {
    clearTimeout(_navTimer);
    _navTimer = setTimeout(() => {
      S._player = null;
      S._video = null;

      const vid = getVideoId();
      S.videoId = vid;

      if (vid) {
        if (vid !== S.sbVideoId) fetchSB(vid);
        if (S.qualityEnabled) {
          [1500, 3000, 5000].forEach((d) => setTimeout(setQuality, d));
        }
      }

      setupObservers();
      uiSync();
    }, 600);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════════════════
  let _toastTimer = null;
  function toast(msg, color = "#333") {
    let el = document.getElementById("et4_toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "et4_toast";
      Object.assign(el.style, {
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        color: "#fff",
        padding: "7px 20px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: "700",
        zIndex: "2147483647",
        pointerEvents: "none",
        fontFamily: "system-ui,sans-serif",
        transition: "opacity .3s, transform .3s",
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.background = color;
    el.style.opacity = "1";
    el.style.transform = "translateX(-50%) translateY(0)";
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateX(-50%) translateY(-8px)";
    }, 2500);
  }

  let _uiRaf = false;
  function uiSync() {
    if (_uiRaf) return;
    _uiRaf = true;
    requestAnimationFrame(() => {
      _uiRaf = false;
      document.getElementById("et4_ad_n")?.replaceChildren(document.createTextNode(S.adCount));
      document.getElementById("et4_sb_n")?.replaceChildren(document.createTextNode(S.sbCount));
      syncToggle("et4_sw_ad", S.adEnabled);
      syncToggle("et4_sw_sb", S.sbEnabled);
      syncToggle("et4_sw_q", S.qualityEnabled);
      const vid = getVideoId();
      const titleEl = document.getElementById("et4_title");
      if (titleEl) titleEl.textContent = vid ? getTitle() : "Open a video to start";
      const idEl = document.getElementById("et4_vid_id");
      if (idEl) idEl.textContent = vid || "N/A";
      // Update download button state
      const dlBtn = document.getElementById("et4_dl_btn");
      if (dlBtn) dlBtn.style.opacity = vid ? "1" : "0.5";
    });
  }

  function syncToggle(id, state) {
    const sw = document.getElementById(id);
    if (!sw) return;
    sw.classList.toggle("on", !!state);
    const st = document.getElementById(id + "_st");
    if (st) st.textContent = state ? "ON" : "OFF";
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PANEL BUILD — Trusted Types compliant (no innerHTML)
  // ═══════════════════════════════════════════════════════════════════════════

  // Create an element with optional class, text content, and attributes
  function mk(tag, cls, text, attrs) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text != null) el.appendChild(document.createTextNode(text));
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "id") el.id = v;
        else el.setAttribute(k, v);
      }
    }
    return el;
  }

  // Build one toggle card (icon + switch + label + state text)
  function makeToggleCard(icon, swId, name, stId) {
    const tc = mk("div", "e4-tc");
    const top = mk("div", "e4-tc-top");
    top.appendChild(mk("span", "e4-tc-ico", icon));
    const btn = mk("button", "e4-sw", null, { id: swId, type: "button" });
    btn.appendChild(mk("span", "e4-thumb"));
    top.appendChild(btn);
    const bot = mk("div", "e4-tc-bot");
    bot.appendChild(mk("span", "e4-tc-name", name));
    bot.appendChild(mk("span", "e4-tc-st", "OFF", { id: stId }));
    tc.appendChild(top);
    tc.appendChild(bot);
    return tc;
  }

  function buildPanel() {
    // ── Toggle button ──────────────────────────────────────────────────────
    const tog = mk("div", null, null, { id: "et4_tog" });
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "22");
    svg.setAttribute("height", "22");
    const path1 = document.createElementNS(svgNS, "path");
    path1.setAttribute(
      "d",
      "M23.5 6.3a3.1 3.1 0 0 0-2.2-2.2C19.4 3.5 12 3.5 12 3.5s-7.4 0-9.3.6A3.1 3.1 0 0 0 .5 6.3 32.7 32.7 0 0 0 0 12a32.7 32.7 0 0 0 .5 5.7 3.1 3.1 0 0 0 2.2 2.2c1.9.6 9.3.6 9.3.6s7.4 0 9.3-.6a3.1 3.1 0 0 0 2.2-2.2A32.7 32.7 0 0 0 24 12a32.7 32.7 0 0 0-.5-5.7Z",
    );
    path1.setAttribute("fill", "#FF0000");
    const path2 = document.createElementNS(svgNS, "path");
    path2.setAttribute("d", "M9.75 15.5V8.5L16 12l-6.25 3.5Z");
    path2.setAttribute("fill", "#FFF");
    svg.appendChild(path1);
    svg.appendChild(path2);
    tog.appendChild(svg);
    document.body.appendChild(tog);

    // ── Panel ──────────────────────────────────────────────────────────────
    const panel = mk("div", null, null, { id: "et4_panel" });

    // Header
    const hdr = mk("div", "e4-hdr", null, { id: "et4_drag" });
    const hdrL = mk("div", "e4-hdr-l");
    hdrL.appendChild(mk("div", "e4-logo", "▶"));
    const hdrTxt = mk("div");
    hdrTxt.appendChild(mk("div", "e4-hdr-title", "EasyTube V4.0"));
    hdrTxt.appendChild(mk("div", "e4-hdr-sub", "Ad Skip · SponsorBlock · 4K · HD Download"));
    hdrL.appendChild(hdrTxt);
    hdr.appendChild(hdrL);
    hdr.appendChild(mk("div", "e4-drag-dot", "⋮"));
    panel.appendChild(hdr);

    // Stats bar
    const stats = mk("div", "e4-stats");
    const pillAd = mk("div", "e4-pill", "🚫 Ads: ");
    pillAd.appendChild(mk("span", null, "0", { id: "et4_ad_n" }));
    const pillSb = mk("div", "e4-pill", "⏭ Sponsors: ");
    pillSb.appendChild(mk("span", null, "0", { id: "et4_sb_n" }));
    stats.appendChild(pillAd);
    stats.appendChild(pillSb);
    stats.appendChild(mk("div", "e4-pill e4-ver", `v${CFG.version}`));
    panel.appendChild(stats);

    // Body
    const body = mk("div", "e4-body");

    // Video card
    const card = mk("div", "e4-card");
    const cardRow = mk("div", "e4-card-row");
    cardRow.appendChild(mk("div", "e4-card-label", "NOW PLAYING"));
    const badge = mk("span", "e4-badge", `● v${CFG.version}`);
    cardRow.appendChild(badge);
    card.appendChild(cardRow);
    card.appendChild(mk("div", "e4-card-title", "Open a video to start", { id: "et4_title" }));
    const cardId = mk("div", "e4-card-id", "ID: ");
    cardId.appendChild(mk("code", null, "N/A", { id: "et4_vid_id" }));
    card.appendChild(cardId);
    body.appendChild(card);

    // ── Download button ────────────────────────────────────────────────────
    const dlBtn = mk("button", "e4-btn e4-btn-red", null, {
      id: "et4_dl_btn",
      type: "button",
    });
    dlBtn.appendChild(mk("span", "e4-btn-ico", "⬇"));
    dlBtn.appendChild(mk("span", null, "Download Video (HD/4K)"));
    body.appendChild(dlBtn);

    // Toggle grid
    const grid = mk("div", "e4-grid");
    grid.appendChild(makeToggleCard("🚫", "et4_sw_ad", "Ad Skip", "et4_sw_ad_st"));
    grid.appendChild(makeToggleCard("⏭", "et4_sw_sb", "SponsorBlock", "et4_sw_sb_st"));
    grid.appendChild(makeToggleCard("✨", "et4_sw_q", "Auto 4K", "et4_sw_q_st"));
    body.appendChild(grid);

    // Info box
    const info = mk("div", "e4-info-box");
    info.appendChild(mk("span", "e4-info-icon", "⚡"));
    info.appendChild(
      mk("span", null, "V4.0: Rewritten for performance — lower CPU, faster skip, no Cobalt timeout lag."),
    );
    body.appendChild(info);

    panel.appendChild(body);
    panel.appendChild(mk("div", "e4-foot", `EasyTube V4.0 · 2pixel · 2025`));

    document.body.appendChild(panel);
    return { panel, tog };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRAG — pointer events, RAF-throttled
  // ═══════════════════════════════════════════════════════════════════════════
  function initDrag(panel) {
    const hdr = panel.querySelector("#et4_drag");
    const vw = window.innerWidth,
      vh = window.innerHeight;
    let ox = vw - 375,
      oy = vh - 580;
    ox = Math.max(8, ox);
    oy = Math.max(8, oy);
    panel.style.transform = `translate3d(${ox}px,${oy}px,0)`;

    let dragging = false,
      pid = null,
      ix = 0,
      iy = 0,
      raf = false;
    const pw = 360,
      ph = 560;

    hdr.addEventListener(
      "pointerdown",
      (e) => {
        dragging = true;
        pid = e.pointerId;
        ix = e.clientX - ox;
        iy = e.clientY - oy;
        panel.classList.add("e4-drag");
        try {
          hdr.setPointerCapture(pid);
        } catch {}
      },
      { passive: true },
    );

    hdr.addEventListener(
      "pointermove",
      (e) => {
        if (!dragging || e.pointerId !== pid || raf) return;
        raf = true;
        requestAnimationFrame(() => {
          ox = Math.max(8, Math.min(window.innerWidth - pw - 8, e.clientX - ix));
          oy = Math.max(8, Math.min(window.innerHeight - ph - 8, e.clientY - iy));
          panel.style.transform = `translate3d(${ox}px,${oy}px,0)`;
          raf = false;
        });
      },
      { passive: true },
    );

    const endDrag = (e) => {
      if (e.pointerId !== pid) return;
      dragging = false;
      panel.classList.remove("e4-drag");
    };
    hdr.addEventListener("pointerup", endDrag, { passive: true });
    hdr.addEventListener("pointercancel", endDrag, { passive: true });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EVENTS
  // ═══════════════════════════════════════════════════════════════════════════
  function bindEvents(panel, tog) {
    let visible = false;
    tog.addEventListener("click", () => {
      visible = !visible;
      panel.classList.toggle("e4-show", visible);
      tog.classList.toggle("e4-active", visible);
      if (visible) uiSync();
    });

    // Download button
    document.getElementById("et4_dl_btn").addEventListener("click", () => {
      const vid = getVideoId();
      if (vid) downloadVideo(vid);
      else toast("⚠ Open a video first", "#f57c00");
    });

    document.getElementById("et4_sw_ad").addEventListener("click", () => {
      S.adEnabled = !S.adEnabled;
      save("et4_ad", S.adEnabled);
      if (!S.adEnabled) {
        const v = getVideo();
        if (v) {
          v.playbackRate = 1;
          v.muted = false;
        }
        S.adSpeedActive = false;
      }
      uiSync();
      toast(S.adEnabled ? "🚫 Ad Skip ON" : "🚫 Ad Skip OFF", S.adEnabled ? "#2e7d32" : "#b71c1c");
    });

    document.getElementById("et4_sw_sb").addEventListener("click", () => {
      S.sbEnabled = !S.sbEnabled;
      save("et4_sb", S.sbEnabled);
      if (S.sbEnabled) {
        S.sbVideoId = null;
        fetchSB(getVideoId());
      }
      uiSync();
      toast(S.sbEnabled ? "⏭ SponsorBlock ON" : "⏭ SponsorBlock OFF", S.sbEnabled ? "#1565c0" : "#4a148c");
    });

    document.getElementById("et4_sw_q").addEventListener("click", () => {
      S.qualityEnabled = !S.qualityEnabled;
      save("et4_quality", S.qualityEnabled);
      if (S.qualityEnabled) setQuality();
      uiSync();
      toast(S.qualityEnabled ? "✨ Auto 4K ON" : "✨ Auto 4K OFF", S.qualityEnabled ? "#e53935" : "#616161");
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STYLES
  // ═══════════════════════════════════════════════════════════════════════════
  GM_addStyle(`
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');

#et4_panel, #et4_panel * { box-sizing:border-box; font-family:'Nunito',system-ui,sans-serif; }

/* ── Toggle button ─────────────────────────────── */
#et4_tog {
    position:fixed; bottom:90px; right:18px;
    width:54px; height:36px; border-radius:999px;
    background:rgba(255,255,255,0.15);
    border:1px solid rgba(255,255,255,0.25);
    box-shadow:0 6px 20px rgba(0,0,0,.22);
    z-index:2147483646; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(16px);
    transition:transform .18s, box-shadow .18s;
}
#et4_tog:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,.3); }
#et4_tog.e4-active svg { transform:rotate(180deg); }
#et4_tog svg { transition:transform .3s; }

/* ── Panel ─────────────────────────────────────── */
#et4_panel {
    position:fixed; top:0; left:0;
    width:355px; max-width:94vw;
    display:flex; flex-direction:column;
    background:rgba(255,255,255,0.12);
    backdrop-filter:blur(32px) saturate(180%);
    -webkit-backdrop-filter:blur(32px) saturate(180%);
    border:1px solid rgba(255,255,255,0.18);
    border-radius:24px;
    box-shadow:0 18px 50px rgba(0,0,0,.30);
    z-index:2147483647; overflow:hidden;
    opacity:0; pointer-events:none;
    transform:scale(.96) translateY(12px);
    transition:opacity .28s, transform .3s cubic-bezier(.25,.46,.45,.94);
    will-change:transform, opacity;
}
#et4_panel.e4-show  { opacity:1; pointer-events:all; transform:scale(1) translateY(0); }
#et4_panel.e4-drag  { transition:none !important; }

/* ── Header ────────────────────────────────────── */
.e4-hdr {
    background:linear-gradient(135deg,#ff1a1a,#b80000);
    padding:12px 14px; cursor:move; user-select:none;
    display:flex; align-items:center; justify-content:space-between;
    border-radius:24px 24px 0 0;
}
.e4-hdr-l    { display:flex; align-items:center; gap:10px; }
.e4-logo     { width:46px; height:32px; background:rgba(255,255,255,.18); border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:20px; color:#fff; font-weight:900; }
.e4-hdr-title { color:#fff; font-size:15px; font-weight:800; line-height:1.2; }
.e4-hdr-sub  { color:rgba(255,255,255,.8); font-size:10px; font-weight:600; }
.e4-drag-dot { color:rgba(255,255,255,.85); font-size:22px; }

/* ── Stats bar ─────────────────────────────────── */
.e4-stats {
    display:flex; gap:5px; padding:7px 12px;
    background:rgba(0,0,0,.06); border-bottom:1px solid rgba(255,255,255,.08);
}
.e4-pill {
    flex:1; background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.18);
    border-radius:999px; padding:4px 8px;
    font-size:11px; font-weight:800; color:#0f0f0f;
    display:flex; align-items:center; justify-content:center; gap:3px;
}
.e4-pill span { font-weight:900; font-size:13px; }
.e4-ver { font-size:10px; color:#555; flex:0 0 auto; padding:4px 10px; }

/* ── Body ──────────────────────────────────────── */
.e4-body {
    padding:11px 13px 13px; overflow-y:auto; flex:1 1 auto;
    scrollbar-width:thin; scrollbar-color:rgba(255,255,255,.3) transparent;
    display:flex; flex-direction:column; gap:9px;
}
.e4-body::-webkit-scrollbar { width:6px; }
.e4-body::-webkit-scrollbar-thumb { background:rgba(255,255,255,.25); border-radius:999px; }

/* ── Video card ────────────────────────────────── */
.e4-card {
    background:rgba(255,255,255,.24); border:1px solid rgba(255,255,255,.2);
    border-radius:18px; padding:11px;
}
.e4-card-row   { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
.e4-card-label { font-size:10px; font-weight:800; color:#606060; text-transform:uppercase; letter-spacing:.6px; }
.e4-badge      { font-size:10.5px; font-weight:700; color:#00a152; background:rgba(232,245,233,.9); padding:3px 9px; border-radius:999px; }
.e4-card-title { font-size:13.5px; font-weight:700; color:#0f0f0f; line-height:1.4; margin-bottom:6px; word-break:break-word; }
.e4-card-id    { font-size:11px; font-weight:600; color:#555; }
.e4-card-id code { background:rgba(255,255,255,.65); padding:2px 8px; border-radius:999px; margin-left:4px; }

/* ── Download button ───────────────────────────── */
.e4-btn {
    display:flex; align-items:center; justify-content:center; gap:9px;
    width:100%; padding:12px 16px; border:none; border-radius:18px;
    font-size:14px; font-weight:800; cursor:pointer; color:#fff;
    text-decoration:none; position:relative; overflow:hidden; letter-spacing:.2px;
    font-family:'Nunito',system-ui,sans-serif;
    transition:transform .2s, box-shadow .2s, opacity .2s;
}
.e4-btn:hover { transform:translateY(-2px); }
.e4-btn:active { transform:scale(.98); }
.e4-btn-red { background:linear-gradient(135deg,#ff1a1a,#cc0000); box-shadow:0 4px 14px rgba(255,0,0,.28); }
.e4-btn-ico { font-size:18px; }

/* ── Toggle grid ───────────────────────────────── */
.e4-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
.e4-tc {
    background:rgba(255,255,255,.22); border:1px solid rgba(255,255,255,.18);
    border-radius:15px; padding:10px 9px;
    display:flex; flex-direction:column; gap:7px;
    transition:transform .15s;
}
.e4-tc:hover   { transform:translateY(-1px); }
.e4-tc-top     { display:flex; align-items:center; justify-content:space-between; }
.e4-tc-ico     { font-size:19px; line-height:1; }
.e4-tc-bot     { display:flex; align-items:center; justify-content:space-between; gap:3px; }
.e4-tc-name    { font-size:11px; font-weight:800; color:#0f0f0f; }
.e4-tc-st      { font-size:10px; font-weight:700; color:rgba(15,15,15,.4); }

/* ── Switch ────────────────────────────────────── */
.e4-sw {
    width:40px; height:24px; border-radius:999px; border:none;
    background:rgba(120,120,128,.28); position:relative; cursor:pointer;
    transition:background .18s; flex:0 0 auto;
}
.e4-sw.on     { background:rgba(52,199,89,.95); }
.e4-thumb {
    position:absolute; top:2px; left:2px; width:20px; height:20px;
    border-radius:999px; background:#fff;
    box-shadow:0 3px 8px rgba(0,0,0,.18);
    transition:transform .18s;
}
.e4-sw.on .e4-thumb { transform:translateX(16px); }

/* ── Info box ──────────────────────────────────── */
.e4-info-box {
    background:rgba(6,95,212,.12); border:1px solid rgba(6,95,212,.2);
    border-radius:14px; padding:9px 12px;
    font-size:11.5px; font-weight:600; color:#0f0f0f;
    display:flex; align-items:flex-start; gap:8px; line-height:1.5;
}
.e4-info-icon { font-size:16px; flex:0 0 auto; margin-top:1px; }

/* ── Footer ────────────────────────────────────── */
.e4-foot {
    padding:8px 13px; background:rgba(255,255,255,.1);
    border-top:1px solid rgba(255,255,255,.1);
    border-radius:0 0 24px 24px; text-align:center;
    font-size:10.5px; color:#606060; font-weight:600;
}
`);

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOT
  // ═══════════════════════════════════════════════════════════════════════════
  function boot() {
    const { panel, tog } = buildPanel();
    initDrag(panel);
    bindEvents(panel, tog);

    uiSync();
    setupObservers();

    // Start SponsorBlock RAF loop
    requestAnimationFrame(checkSB);

    // Periodic UI sync
    setInterval(uiSync, 2500);

    // Navigation detection
    const navObs = new MutationObserver(() => {
      if (location.href !== S.lastUrl) {
        S.lastUrl = location.href;
        S.sbVideoId = null;
        S.sbSegments = [];
        onNavigate();
      }
    });
    navObs.observe(document.body, { childList: true, subtree: false });

    window.addEventListener("yt-navigate-finish", () => onNavigate(), {
      passive: true,
    });
    window.addEventListener("yt-page-data-updated", () => onNavigate(), {
      passive: true,
    });
    window.addEventListener(
      "yt-navigate-start",
      () => {
        S.sbVideoId = null;
        S.sbSegments = [];
        S._player = null;
        S._video = null;
      },
      { passive: true },
    );

    onNavigate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
};
export class AdBlocker {
  // blocker: CustomAds;
  blocker: ElectronBlocker;
  async initialize() {
    // this.blocker = await ElectronBlocker.fromLists(fetch, Array.from(ALL_LISTS.values()));
    // this.blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch);
    this.blocker = await ElectronBlocker.fromLists(
      fetch,
      fullLists,
      {
        enableCompression: true,
      },
      // {
      //   path: "engine.bin",
      //   read: async (...args) => readFileSync(...args),
      //   write: async (...args) => writeFileSync(...args),
      // },
    );
  }

  setupAdvancedRequestBlocking(view: WebContentsView) {
    // console.log("Start setupAdvancedRequestBlocking");
    // this.blocker?.enableBlockingInSession(session.fromPartition("persist:minus-browser"));
    this.blocker?.enableBlockingInSession(view.webContents.session);
    // this.onShowADBlockRequest();
    this.injectYoutubeAdblockSponsor(view);
  }

  injectYoutubeAdblockSponsor(view: WebContentsView) {
    // console.log("Start Inject Youtube Adblock Sponsor");
    /**
     * @todo: Script injection to Document
     * @idea
     * - Custom Plugin same as Tampermonkey
     */
    if (!view || !view.webContents) return;

    view.webContents.on("did-navigate", () => {
      if (view.webContents.getURL().includes("youtube.com")) {
        view.webContents
          .executeJavaScript(`(${SponsorBlock.toString()})();(${SkipADSBlock.toString()})();`)
          .catch((err) => {
            console.error("[YT Adblock] Injection failed:", err);
          });
      }
    });

    return;
    // const script = [
    //   this.youtubePatchPlayer(),
    //   this.youtubeRemovePopups(),
    //   this.skipAds(),
    //   `(${SponsorBlock.toString()})();`,
    // ];

    // // Inject trực tiếp vào renderer
    // if (view.webContents.getURL().includes("youtube.com")) {
    //   view.webContents
    //     .executeJavaScript(script.join("\n"))
    //     .then(() => {
    //       console.error("[YT Adblock] Successfully injected patch!");
    //     })
    //     .catch((err) => {
    //       console.error("[YT Adblock] Injection failed:", err);
    //     });
    // }
  }

  // youtubePatchPlayer() {
  //   const script = function () {
  //     "use strict";
  //     console.log("[YT Adblock] Injecting patch...");
  //     const origDefineProperty = Object.defineProperty;
  //     Object.defineProperty = function (obj, prop, desc) {
  //       if (prop === "ads" || prop === "ytads") {
  //         console.log("[YT Adblock] Blocked property injection:", prop);
  //         return obj;
  //       }
  //       return origDefineProperty.apply(this, arguments);
  //     };
  //     // Quan sát DOM và patch player khi có
  //     const observer = new MutationObserver(() => {
  //       const player: any = document.querySelector("ytd-player");
  //       /** @ts-ignore */
  //       if (player && player.player_ && typeof player.player_.getAdState === "function") {
  //         /** @ts-ignore */
  //         player.player_.getAdState = () => 0; // luôn không có ad
  //         console.log("[YT Adblock] Patched mid-roll ads!");
  //         observer.disconnect();
  //       }
  //     });
  //     observer.observe(document, { childList: true, subtree: true });
  //   };
  //   return `(${script.toString()})();`;
  // }

  // youtubeRemovePopups() {
  //   const script = function () {
  //     "use strict";
  //     const removeElements = () => {
  //       const popupContainer = document.querySelector("ytd-popup-container");
  //       const overlayBackdrop = document.querySelector("tp-yt-iron-overlay-backdrop");

  //       if (popupContainer) {
  //         popupContainer.remove();
  //         console.log("Removed ytd-popup-container");
  //       }

  //       if (overlayBackdrop) {
  //         overlayBackdrop.remove();
  //         console.log("Removed overlay backdrop");
  //       }
  //     };
  //     // Run initially
  //     removeElements();
  //     // Observe and re-run when elements are reinserted
  //     const observer = new MutationObserver(removeElements);
  //     observer.observe(document.body, {
  //       childList: true,
  //       subtree: true,
  //     });
  //   };
  //   return `(${script.toString()})();`;
  // }

  // skipAds() {
  //   const script = function () {
  //     function skipAds() {
  //       const pipMode = document.querySelector("ytd-pip-container, ytd-miniplayer-player-container");
  //       const adVideo = document.querySelector(".ad-showing video");

  //       /**@ts-ignore */
  //       if (adVideo && adVideo.duration) {
  //         /**@ts-ignore */
  //         adVideo.currentTime = adVideo.duration;
  //         /**@ts-ignore */
  //         adVideo.muted = true;
  //       }
  //       const skipBtn = document.querySelector(".ytp-ad-skip-button, .ytp-ad-skip-button-modern");
  //       if (skipBtn) {
  //         /**@ts-ignore */
  //         skipBtn.click();
  //       }

  //       if (document.querySelector(".ad-showing")) {
  //         setTimeout(skipAds, 500);
  //       }
  //     }
  //     function keepVideoPlayingEarly() {
  //       const video = document.querySelector("video");
  //       if (!video || video.dataset.keepPlayingEarly) return;

  //       video.dataset.keepPlayingEarly = "true";

  //       const onPause = () => {
  //         if (video.currentTime <= 3) {
  //           video
  //             .play()
  //             .then(() => {})
  //             .catch((err) => {
  //               console.warn("[Userscript] Impossible de play :", err);
  //             });
  //         }
  //         video.removeEventListener("pause", onPause);
  //       };

  //       video.addEventListener("pause", onPause);
  //     }
  //     /**@ts-ignore */
  //     let debounceTimeout;
  //     const observer = new MutationObserver(() => {
  //       /**@ts-ignore */
  //       clearTimeout(debounceTimeout);
  //       debounceTimeout = setTimeout(() => {
  //         skipAds();
  //         keepVideoPlayingEarly();
  //       }, 100);
  //     });
  //     observer.observe(document.body, { childList: true, subtree: true });
  //   };

  //   return `(${script.toString()})();`;
  // }

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
      log.info("%cRed script-injected", script.length, url, "color: red");
    });
    this.blocker.on("style-injected", (style: string, url: string) => {
      log.info("%cRed style-injected", style.length, url, "color: red");
    });
    this.blocker.on("filter-matched", console.log.bind(console, "%cfilter-matched"));
  }
}
