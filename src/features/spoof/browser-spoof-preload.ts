import { ipcRenderer, webFrame } from 'electron'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

const languages: string[] = (() => {
  try {
    const langs = ipcRenderer.sendSync(IPC_INVOKE_CHANNEL.LANGUAGE_GET)
    return Array.isArray(langs) && langs.length ? langs.filter(Boolean) : ['vi-VN', 'vi']
  } catch (_) {
    return ['vi-VN', 'vi']
  }
})()

webFrame.executeJavaScript(`
(function() {
  try {
    delete Navigator.prototype.webdriver;
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => true,
      configurable: true,
      enumerable: true,
    });
  } catch(_) {}

  try {
    delete Navigator.prototype.language;
    Object.defineProperty(Navigator.prototype, 'language', {
      get: () => ${JSON.stringify(languages[0])},
      configurable: true,
      enumerable: true,
    });
    delete Navigator.prototype.languages;
    Object.defineProperty(Navigator.prototype, 'languages', {
      get: () => ${JSON.stringify(languages)},
      configurable: true,
      enumerable: true,
    });
  } catch(_) {}

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
