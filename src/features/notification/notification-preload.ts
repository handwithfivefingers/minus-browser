import { contextBridge, ipcRenderer, webFrame } from 'electron'

const tabId = process.argv.find((arg) => arg.startsWith('--notification-tab-id='))?.split('=')[1] || ''

contextBridge.exposeInMainWorld('__notificationAPI', {
  notify: (data: { title: string; body: string; tag: string }) => {
    if (window.Notification.permission === 'denied') return
    ipcRenderer.send('WEB_NOTIFICATION', { ...data, tabTitle: document.title, tabId })
  },
})

webFrame.executeJavaScript(`
  (function() {
    const api = window.__notificationAPI;
    if (!api) return;

    const OrigNotify = window.Notification;

    window.Notification = function(title, options) {
      api.notify({
        title: String(title || ''),
        body: String((options && options.body) || ''),
        tag: String((options && options.tag) || ''),
      });

      var n = Object.create(OrigNotify.prototype);
      n.title = String(title || '');
      n.body = String((options && options.body) || '');
      n.tag = String((options && options.tag) || '');
      n.dir = String((options && options.dir) || 'auto');
      n.lang = String((options && options.lang) || '');
      n.requireInteraction = !!(options && options.requireInteraction);
      n.silent = !!(options && options.silent);
      n.data = (options && options.data) || null;
      n.close = function() {};
      n.addEventListener = function() {};
      n.removeEventListener = function() {};
      n.dispatchEvent = function() { return false; };
      return n;
    };

    window.Notification.permission = OrigNotify.permission;
    window.Notification.requestPermission = function(callback) {
      var result = OrigNotify.requestPermission();
      if (callback) result.then(callback);
      return result;
    };
    window.Notification.maxActions = OrigNotify.maxActions || 0;
  })();
`)
