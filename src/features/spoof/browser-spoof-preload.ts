import { webFrame } from 'electron'
webFrame.executeJavaScript(`
(function() {
  // Twitch/Kasada (protected_login 5025) — Kasada detects fake globals as bot. Clean up like Min (no spoof).
  // Delete our Electron globals so Kasada's fingerprint doesn't see __mediaAPI etc.
  try {
    var h2 = location.hostname || '';
    if (/(^|\\.)twitch.tv$|ttvnw.net|twitchcdn.net|passport.twitch.tv|kasada|kpsdk|amazon-adsystem|k.twitch|s.amazon/i.test(h2)) {
      try { delete window.__mediaAPI; } catch(_) {}
      try { delete window.__notificationAPI; } catch(_) {}
      try { delete window.__userscript_bridge__; } catch(_) {}
      try { delete window.__vaultAPI; } catch(_) {}
      try { delete window.__adblockAPI; } catch(_) {}
      return;
    }
  } catch(_) {}
  // Skip all spoofing on Twitch/Kasada domains — let Kasada see clean Electron+UA (like Min does no spoof)
  // Kasada's kpsdk detects fake window.chrome / fake plugins / altered webdriver as bot
  try {
    var h = location.hostname || '';
    if (/(^|\\.)twitch.tv$|ttvnw.net|twitchcdn.net|passport.twitch.tv|kasada|kpsdk|amazon-adsystem|k.twitch|s.amazon|amazon-adsystem|k\\.twitch|s\\.amazon/i.test(h)) return;
  } catch(_) {}

  try {
    // Use false (real Chrome) not undefined — Kasada checks webdriver === false
    delete Navigator.prototype.webdriver;
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: function() { return false; },
      configurable: true,
      enumerable: true,
    });
  } catch(_) {}

  // Spoof Client Hints: Twitch and other sites read navigator.userAgentData.brands
  // Electron's brands include "Electron" which triggers "unsupported browser".
  // Mirror Min: normalize to major.0.0.0 (e.g. 150.0.0.0) so Twitch's "last 2 versions" check passes
  try {
    var origUAD = (typeof navigator !== 'undefined' && navigator.userAgentData) ? navigator.userAgentData : (Navigator.prototype && Navigator.prototype.userAgentData);
    var getMajor = function() { try { var m = navigator.userAgent.match(/Chrome[/]([0-9]+)/); return m ? parseInt(m[1],10) : 150; } catch(_) { return 150; } };
    var cleanBrands = function(brands) {
      if (!Array.isArray(brands)) return brands;
      var filtered = brands.filter(function(b) { return b.brand !== 'Electron' && b.brand !== 'MinusBrowser'; });
      var major = getMajor();
      for (var i = 0; i < filtered.length; i++) {
        if (filtered[i].brand === 'Chromium' || filtered[i].brand === 'Google Chrome') {
          var v = parseInt(filtered[i].version, 10);
          if (!isNaN(v) && v < major) filtered[i].version = String(major);
        }
      }
      return filtered;
    };
    var bumpBrandVersions = function(brands) {
      if (!Array.isArray(brands)) return brands;
      var out = cleanBrands(brands);
      var major = getMajor();
      var full = major + '.0.0.0';
      for (var k = 0; k < out.length; k++) {
        if (out[k].brand === 'Chromium' || out[k].brand === 'Google Chrome') {
          var vv = parseInt(out[k].version, 10);
          if (!isNaN(vv) && vv < major) out[k].version = full;
        }
      }
      return out;
    };
    if (origUAD) {
      var origGetHighEntropyValues = origUAD.getHighEntropyValues ? origUAD.getHighEntropyValues.bind(origUAD) : null;
      var origBrands = origUAD.brands;
      var origMobile = origUAD.mobile;
      var origPlatform = origUAD.platform;
      var spoofedUAD = {
        get brands() { return cleanBrands(origBrands || (origUAD.brands || [])); },
        get mobile() { return typeof origMobile !== 'undefined' ? origMobile : (origUAD.mobile || false); },
        get platform() { return origPlatform || origUAD.platform || (navigator.platform || ''); },
        getHighEntropyValues: function(hints) {
          if (!origGetHighEntropyValues) return Promise.resolve({ brands: cleanBrands([]), mobile: false, platform: '' });
          return origGetHighEntropyValues(hints).then(function(data) {
            if (data && data.brands) data.brands = bumpBrandVersions(data.brands);
            if (data && data.fullVersionList) data.fullVersionList = bumpBrandVersions(data.fullVersionList);
            return data;
          });
        },
        toJSON: function() { try { return origUAD.toJSON(); } catch(_) { return {}; } }
      };
      // Define on instance first (shadows prototype), then prototype as fallback
      try { Object.defineProperty(navigator, 'userAgentData', { get: function() { return spoofedUAD; }, configurable: true }); } catch(_) {}
      try { Object.defineProperty(Navigator.prototype, 'userAgentData', { get: function() { return spoofedUAD; }, configurable: true }); } catch(_) {}
    }
  } catch(_) {}

  // Only fake plugins/languages if truly empty and not on Twitch (Kasada validates these)
  try {
    if (navigator.plugins && navigator.plugins.length === 0) {
      var fakePlugin = { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format', length: 1 };
      try { Object.defineProperty(navigator, 'plugins', { get: function() { return [fakePlugin]; }, configurable: true }); } catch(_) {}
    }
  } catch(_) {}
  try {
    if (!navigator.languages || navigator.languages.length === 0) {
      try { Object.defineProperty(navigator, 'languages', { get: function() { return ['en-US', 'en']; }, configurable: true }); } catch(_) {}
    }
  } catch(_) {}

  // window.chrome shim — needed for Twitch player detection, but skip on Kasada (already returned early)
  try {
    if (!window.chrome) {
      var makeEvent = function() {
        var obj = { addListener: function() {}, removeListener: function() {}, hasListener: function() {} };
        return obj;
      };
      var makePort = function() {
        return {
          name: '',
          disconnect: function() {},
          postMessage: function() {},
          onMessage: { addListener: function() {}, removeListener: function() {}, hasListener: function() {} },
          onDisconnect: { addListener: function() {}, removeListener: function() {}, hasListener: function() {} },
        };
      };
      var now = Date.now();
      window.chrome = {
        runtime: {
          id: '',
          connect: function() { return makePort(); },
          sendMessage: function() {},
          getManifest: function() { return { name: '', version: '', manifest_version: 2 }; },
          getURL: function(p) { return p; },
          reload: function() {},
          restart: function() {},
          onConnect: makeEvent(),
          onMessage: makeEvent(),
          onInstalled: makeEvent(),
          onStartup: makeEvent(),
          onSuspend: makeEvent(),
          onSuspendCanceled: makeEvent(),
          onUpdateAvailable: makeEvent(),
          onBrowserUpdateAvailable: makeEvent(),
        },
        app: {
          isInstalled: false,
          InstallState: { DISABLED: 'disabled', INSTALLED: 'installed', NOT_INSTALLED: 'not_installed' },
          RunningState: { CANNOT_RUN: 'cannot_run', READY_TO_RUN: 'ready_to_run', RUNNING: 'running' },
          getDetails: function() { return null; },
          getIsInstalled: function() {},
          installState: function(cb) { if (cb) cb('not_installed'); },
          runningState: function(cb) { if (cb) cb('cannot_run'); },
        },
        csi: function() {
          return {
            onloadT: now,
            pageT: now,
            startE: now,
            tran: 0,
          };
        },
        loadTimes: function() {
          return {
            requestTime: 0,
            startLoadTime: 0,
            commitLoadTime: 0,
            finishDocumentLoadTime: 0,
            finishLoadTime: 0,
            firstPaintTime: 0,
            firstPaintAfterLoadTime: 0,
            navigationType: 'other',
            wasFetchedViaSpdy: false,
            wasNpnNegotiated: false,
            npnNegotiatedProtocol: 'unknown',
            wasAlternateProtocolAvailable: false,
            connectionInfo: 'http/1.1',
          };
        },
        webstore: {
          onInstallStageChanged: makeEvent(),
          onDownloadProgress: makeEvent(),
        },
      };
    }
  } catch(_) {}
})();
`)
