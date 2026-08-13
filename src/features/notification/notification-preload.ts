import { contextBridge, ipcRenderer, webFrame } from 'electron'

const tabId = process.argv.find((arg) => arg.startsWith('--notification-tab-id='))?.split('=')[1] || ''

contextBridge.exposeInMainWorld('__notificationAPI', {
  notify: (data: { title: string; body: string; tag: string }) => {
    if (window.Notification.permission === 'denied') return
    ipcRenderer.send('WEB_NOTIFICATION', { ...data, tabTitle: document.title, tabId })
  },
  pipExited: () => {
    ipcRenderer.send('send', { channel: 'PIP_EXITED', data: { id: tabId } })
  },
  videoListChanged: (videos: unknown[]) => {
    ipcRenderer.send('MEDIA_LIST_CHANGED', { tabId, videos })
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

webFrame.executeJavaScript(`
  (function() {
    try {
      if (window.__pipMediaListInjected) return;
      window.__pipMediaListInjected = true;

      var api = window.__notificationAPI;
      if (!api) return;

      var lastSignature = '';
      var timer = null;

      function playable(v) {
        if (!v || !v.tagName || v.tagName.toLowerCase() !== 'video') return false;
        if (v.disablePictureInPicture) return false;
        if (v.readyState === 0 && !v.currentSrc && !v.src) return false;
        return true;
      }

      function guessTitle(v) {
        if (v.getAttribute('aria-label')) return v.getAttribute('aria-label');
        if (v.title) return v.title;
        var host = v.closest('article, section, [class*="title"], [class*="player"], [id*="player"]');
        if (host) {
          var heading = host.querySelector('h1, h2, h3, [class*="title"]');
          if (heading && heading.textContent && heading.textContent.trim()) return heading.textContent.trim();
        }
        return document.title || '';
      }

      function build() {
        var all = Array.prototype.slice.call(document.querySelectorAll('video'));
        return all.filter(playable).map(function(v, i) {
          var duration = v.duration;
          return {
            id: i,
            title: guessTitle(v),
            src: v.currentSrc || v.src || '',
            currentTime: Math.round(v.currentTime || 0),
            duration: isFinite(duration) ? Math.round(duration) : 0,
            paused: v.paused,
            poster: v.poster || '',
          };
        });
      }

      function signature(list) {
        return list.map(function(v) {
          return v.id + ':' + v.src + ':' + v.paused + ':' + Math.floor((v.currentTime || 0) / 5);
        }).join('|');
      }

      function send() {
        try {
          var list = build();
          var sig = signature(list);
          if (sig === lastSignature) return;
          lastSignature = sig;
          if (api.videoListChanged) api.videoListChanged(list);
        } catch (e) {}
      }

      function schedule() {
        if (timer) return;
        timer = setTimeout(function() {
          timer = null;
          send();
        }, 250);
      }

      // Observer can fail on early documents (documentElement not ready yet).
      // It must never block the reliable polling below.
      try {
        var root = document.documentElement || document;
        var observer = new MutationObserver(schedule);
        observer.observe(root, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['src'],
        });
      } catch (e) {}

      // Polling is the source of truth; also catches videos whose src is set
      // via property assignment (no attribute mutation to observe).
      setInterval(send, 2000);
      send();

      // Fast path: re-scan right after a video starts or loads metadata.
      document.addEventListener('play', schedule, true);
      document.addEventListener('loadedmetadata', schedule, true);
    } catch (e) {}
  })();
`)
