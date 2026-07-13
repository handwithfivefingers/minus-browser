export const NOTIFICATION_LIST_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: transparent; overflow: hidden; }

  /* Toast */
  .toast {
    position: fixed;
    top: 12px;
    right: 12px;
    width: 360px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    border: 1px solid #e2e8f0;
    overflow: hidden;
    animation: slideIn 0.25s ease-out;
    z-index: 100;
  }
  .toast.dismissing {
    animation: slideOut 0.2s ease-in forwards;
  }
  @keyframes slideIn {
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(120%); opacity: 0; }
  }
  .toast-inner {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    align-items: flex-start;
  }
  .toast-avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #e2e8f0;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden;
    font-size: 12px; font-weight: 500; color: #64748b;
  }
  .toast-avatar img { width: 20px; height: 20px; }
  .toast-content { flex: 1; min-width: 0; }
  .toast-source { font-size: 11px; color: #94a3b8; margin-bottom: 1px; }
  .toast-title { font-size: 13px; font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .toast-body { font-size: 12px; color: #64748b; margin-top: 2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .toast-actions { display: flex; gap: 6px; margin-top: 8px; }
  .toast-actions button {
    font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 5px;
    border: none; cursor: pointer; transition: background 0.1s;
  }
  .toast-btn-switch { background: #6366f1; color: white; }
  .toast-btn-switch:hover { background: #4f46e5; }
  .toast-btn-dismiss { background: transparent; color: #94a3b8; }
  .toast-btn-dismiss:hover { background: #f1f5f9; color: #64748b; }
  .toast-close {
    background: none; border: none; cursor: pointer; color: #cbd5e1;
    padding: 2px; flex-shrink: 0; font-size: 14px; line-height: 1;
  }
  .toast-close:hover { color: #94a3b8; }

  /* List */
  .list {
    width: 380px;
    max-height: 480px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    border: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .list-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;
  }
  .list-header h3 { font-size: 14px; font-weight: 600; color: #1e293b; }
  .list-header button { background: none; border: none; cursor: pointer; color: #94a3b8; font-size: 12px; }
  .list-header button:hover { color: #6366f1; }
  .mark-all { color: #6366f1 !important; font-size: 11px !important; display: flex; align-items: center; gap: 4px; }
  .items { flex: 1; overflow-y: auto; max-height: 430px; }
  .item {
    display: flex; gap: 10px; padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9; cursor: pointer;
    transition: background 0.1s; align-items: flex-start;
  }
  .item:hover { background: #f8fafc; }
  .item.unread { background: #eef2ff; }
  .item .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: #e2e8f0; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden; font-size: 12px; font-weight: 500; color: #64748b;
  }
  .item .avatar img { width: 20px; height: 20px; }
  .item .content { flex: 1; min-width: 0; }
  .item .meta { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
  .item .source { font-size: 11px; color: #94a3b8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item .time { font-size: 10px; color: #cbd5e1; flex-shrink: 0; }
  .item .title { font-size: 13px; color: #1e293b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .item.unread .title { font-weight: 600; }
  .item .body {
    font-size: 12px; color: #64748b; margin-top: 2px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .item .dismiss { background: none; border: none; cursor: pointer; color: #e2e8f0; padding: 2px; flex-shrink: 0; }
  .item .dismiss:hover { color: #94a3b8; }
  .empty { padding: 32px; text-align: center; color: #94a3b8; font-size: 13px; }
</style>
</head>
<body>
  <div id="toast" class="toast" style="display:none">
    <div class="toast-inner">
      <div class="toast-avatar" id="toastAvatar">N</div>
      <div class="toast-content">
        <div class="toast-source" id="toastSource"></div>
        <div class="toast-title" id="toastTitle"></div>
        <div class="toast-body" id="toastBody"></div>
        <div class="toast-actions">
          <button class="toast-btn-switch" id="toastSwitch">Switch to Tab</button>
          <button class="toast-btn-dismiss" id="toastDismiss">Dismiss</button>
        </div>
      </div>
      <button class="toast-close" id="toastClose">✕</button>
    </div>
  </div>

  <div class="list" id="list" style="display:none">
    <div class="list-header">
      <h3>Notifications</h3>
      <div>
        <button class="mark-all" id="clearAllBtn" style="display:none">✕ Clear all</button>
        <button class="mark-all" id="markAllBtn" style="display:none">✔ Mark all read</button>
        <button id="closeBtn">✕</button>
      </div>
    </div>
    <div class="items" id="items"></div>
  </div>

<script>
  const api = window.notificationViewAPI;
  const toastEl = document.getElementById('toast');
  const listEl = document.getElementById('list');
  const items = document.getElementById('items');
  const markAllBtn = document.getElementById('markAllBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const closeBtn = document.getElementById('closeBtn');
  let toastTimer = null;
  let toastQueue = [];
  let toastShowing = false;

  /* --- Toast --- */
  function showToast(data) {
    toastQueue.push(data);
    processToastQueue();
  }

  function processToastQueue() {
    if (toastShowing || toastQueue.length === 0) return;
    toastShowing = true;
    const data = toastQueue.shift();

    document.getElementById('toastAvatar').innerHTML = data.favicon
      ? '<img src="' + data.favicon + '" alt="">'
      : (data.tabTitle || data.title).charAt(0).toUpperCase();
    document.getElementById('toastSource').textContent = data.tabTitle || 'Unknown tab';
    document.getElementById('toastTitle').textContent = data.title;
    document.getElementById('toastBody').textContent = data.body || '';
    document.getElementById('toastBody').style.display = data.body ? '' : 'none';
    document.getElementById('toastSwitch').dataset.tabId = data.tabId;
    document.getElementById('toastSwitch').dataset.id = data.id;

    toastEl.className = 'toast';
    toastEl.style.display = '';

    clearTimeout(toastTimer);
    toastTimer = setTimeout(dismissToast, 4000);
  }

  function dismissToast() {
    if (!toastShowing) return;
    toastEl.className = 'toast dismissing';
    setTimeout(function() {
      toastEl.style.display = 'none';
      toastShowing = false;
      processToastQueue();
    }, 200);
    clearTimeout(toastTimer);
  }

  document.getElementById('toastClose').addEventListener('click', dismissToast);
  document.getElementById('toastDismiss').addEventListener('click', function() {
    api.onMarkRead(document.getElementById('toastSwitch').dataset.id);
    dismissToast();
  });
  document.getElementById('toastSwitch').addEventListener('click', function() {
    api.onClickNotification(this.dataset.tabId);
    dismissToast();
  });

  /* --- List --- */
  function formatTime(ts) {
    var diff = Date.now() - ts;
    if (diff < 60000) return 'now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h';
    return Math.floor(diff/86400000) + 'd';
  }

  var notifications = [];

  function renderList() {
    if (notifications.length === 0) {
      items.innerHTML = '<div class="empty">No notifications</div>';
      markAllBtn.style.display = 'none';
      clearAllBtn.style.display = 'none';
      return;
    }
    var hasUnread = notifications.some(function(n) { return !n.read; });
    markAllBtn.style.display = hasUnread ? 'inline' : 'none';
    clearAllBtn.style.display = 'inline';

    items.innerHTML = notifications.map(function(n) {
      return '<div class="item ' + (n.read ? '' : 'unread') + '" data-id="' + n.id + '" data-tab-id="' + n.tabId + '">'
        + '<div class="avatar">' + (n.favicon ? '<img src="' + n.favicon + '" alt="">' : (n.tabTitle || n.title).charAt(0).toUpperCase()) + '</div>'
        + '<div class="content">'
        + '<div class="meta"><span class="source">' + (n.tabTitle || 'Unknown tab') + '</span><span class="time">' + formatTime(n.timestamp) + '</span></div>'
        + '<div class="title">' + n.title + '</div>'
        + (n.body ? '<div class="body">' + n.body + '</div>' : '')
        + '</div>'
        + '<button class="dismiss" data-dismiss="' + n.id + '">✕</button>'
        + '</div>';
    }).join('');

    items.querySelectorAll('.item').forEach(function(el) {
      el.addEventListener('click', function(e) {
        if (e.target.closest('.dismiss')) return;
        api.onClickNotification(this.dataset.tabId);
      });
    });
    items.querySelectorAll('.dismiss').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        api.onMarkRead(this.dataset.dismiss);
        renderList();
      });
    });
    // Re-attach close handler after render
    document.getElementById('closeBtn').onclick = function() { api.onClose(); };
    document.getElementById('markAllBtn').onclick = function() { api.onMarkAllRead(); };
    document.getElementById('clearAllBtn').onclick = function() { api.onClearAll(); };
  }

  closeBtn.onclick = function() { api.onClose(); };
  markAllBtn.onclick = function() { api.onMarkAllRead(); };
  clearAllBtn.onclick = function() { api.onClearAll(); };

  /* --- IPC --- */
  api.onToast(function(data) {
    showToast(data);
  });

  api.onHistory(function(data) {
    if (data && Array.isArray(data)) {
      notifications = data;
      if (listEl.style.display !== 'none') renderList();
    }
  });

  api.onShowToast(function() {
    toastEl.style.display = '';
  });

  api.onHideToast(function() {
    dismissToast();
    toastQueue = [];
  });

  api.onShowList(function() {
    listEl.style.display = '';
    renderList();
  });

  api.onHideList(function() {
    listEl.style.display = 'none';
  });
</script>
</body>
</html>`;
