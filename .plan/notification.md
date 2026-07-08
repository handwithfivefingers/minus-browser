# Notification System

## Problem

1. Tab-a (background) sends web Notification while user is on Tab-b (active)
2. macOS suppresses OS notifications from the focused/foreground app → notification never shows
3. Notifications only appear when app loses focus (OS-level behavior)
4. No notification history/list UI
5. No click-to-switch-tab from notifications

## Architecture

Self-contained feature at `src/features/notification/` — same pattern as `findbar/`, `tabGroup/`, `adblocker/`.

```
src/features/notification/
├── notification-preload.ts    # Web page Notification API interceptor
├── constants.ts               # IPC channel name
├── service.ts                 # Main process handler
├── store.ts                   # Zustand store (notification list + unread count)
└── components/
    ├── NotificationList.tsx   # Popover/dropdown of recent notifications
    └── NotificationBell.tsx   # Bell icon + unread badge in sidebar
```

## Data Flow

```
Web page → window.Notification()
  → notification-preload.ts intercepts
  → ipcRenderer.send('WEB_NOTIFICATION', { tabId, title, body, tag })
  → service.ts handle() (main process):
       ├─ adds to notification store (persistent list)
       ├─ if app is focused:
       │    → forwardRendererEvent('NOTIFICATION_POPUP', { ... })
       │    → NotificationContainer shows in-app toast
       └─ if app is NOT focused:
            → new Electron.Notification({ title, body })
              on('click') → handleOpenTabById(tabId)
```

## Notification Store Shape

```ts
interface WebNotification {
  id: string;
  tabId: string;
  tabTitle: string;
  favicon: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}
```

## Notification List (UI)

- **NotificationBell** — icon in sidebar with unread count badge
- **NotificationList** — dropdown/popover with recent notifications
  - Each item shows: favicon, source tab name, notification title/body, time
  - "Switch to Tab" button → `OPEN_TAB_BY_ID`
  - Badge showing number of new notifications

## In-App Toast (existing NotificationContainer)

When app is focused, show a toast for each new background notification:
- Title, body, source tab favicon
- Action: "Switch to Tab"

## Files to Create

| File | Purpose |
|---|---|
| `src/features/notification/notification-preload.ts` | Intercepts `window.Notification` in web pages, sends IPC |
| `vite.notification-preload.config.ts` | Empty Vite config (same as `vite.adb-preload.config.ts`) |
| `src/features/notification/constants.ts` | IPC channel constant `WEB_NOTIFICATION` |
| `src/features/notification/service.ts` | Main process handler |
| `src/features/notification/store.ts` | Zustand store |
| `src/features/notification/components/NotificationList.tsx` | Notification history dropdown |
| `src/features/notification/components/NotificationBell.tsx` | Bell icon with unread count |

## Files to Modify

| File | What Changes |
|---|---|
| `forge.config.ts` | Add preload entry for notification-preload |
| `src/features/tabs/models/tab.ts` | Pass `preload` path to `WebContentsView` options |
| `src/core/controller/viewController.ts` | Register `WEB_NOTIFICATION` IPC handler → calls service |
| `src/features/ui/components/sidebar/index.tsx` | Mount `NotificationBell` |
| `src/features/ui/pages/layout.tsx` | Listen for `NOTIFICATION_POPUP` renderer event |
| `src/interface.d.ts` | Add `NOTIFICATION_POPUP` to listener channel types |
| `src/shared/constants/ipc.ts` | Add `WEB_NOTIFICATION` to emit channels |

## Behaviour by App State

| App State | Toast | OS Notification | Added to List |
|---|---|---|---|
| Focused | Yes | No | Yes |
| Backgrounded | No | Yes (click → switch tab) | Yes |
