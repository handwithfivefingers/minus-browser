const { webFrame } = require('electron')

webFrame.executeJavaScript(`
(function() {
  try {
    delete Navigator.prototype.webdriver;
    Object.defineProperty(Navigator.prototype, 'webdriver', {
      get: () => undefined,
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
      window.chrome = {
        runtime: {
          id: '',
          connect: function() {},
          sendMessage: function() {},
          getManifest: function() { return {}; },
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
        csi: function() { return {}; },
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
