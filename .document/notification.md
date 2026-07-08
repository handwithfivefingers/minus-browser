# Notification System

## Problem

1. Tab-a (background) sends web Notification while user is on Tab-b (active)
2. macOS suppresses OS notifications from the focused/foreground app → notification never shows
3. Notifications only appear when app loses focus (OS-level behavior)
4. No notification history/list UI
5. No click-to-switch-tab from notifications

## Architecture

Single combined WebContentsView at `src/features/notification/view/` — handles both toast and list modes.

```
src/features/notification/
├── notification-preload.ts          # Web page Notification API interceptor
├── notification-view-preload.ts     # IPC bridge for the notification view WebContents
├── constants.ts                     # Reserved for IPC channel constants
├── service.ts                       # Main process orchestrator
├── store.ts                         # Zustand store (notification list + unread count)
├── view/
│   ├── index.ts                     # Combined toast + list HTML template
│   └── viewService.ts              # WebContentsView lifecycle, toast queue, bounds
└── components/
    ├── NotificationList.tsx         # (optional) Renderer-side list
    └── NotificationBell.tsx         # Bell icon + unread badge in sidebar
```

## Data Flow

```
Web page → window.Notification()
  → notification-preload.ts intercepts (webFrame.executeJavaScript override)
  → ipcRenderer.send('WEB_NOTIFICATION', { tabId, title, body, tag })
  → NotificationService.handleIncomingNotification (main process):
       ├─ adds to Zustand store (persistent list)
       ├─ if app is focused:
       │    → viewService.showToast()
       │    → NotificationWebContentView shows in-app toast (top-right, 4s auto-dismiss)
       └─ if app is NOT focused:
            → new Electron.Notification({ title, body })
              on('click') → handleOpenTabById(tabId)
```

## Combined WebContentsView

Single `WebContentsView` at `view/viewService.ts:NotificationViewService`:

| Mode | Position | Behavior |
|---|---|---|
| **Toast** | Top-right, 380×150 | Slide-in, auto-dismiss 4s, queue subsequent |
| **List** | Top-right, 390×500 | Dropdown with full history, mark read/dismiss |

### IPC Channels (notification view → main)

| Channel | Direction | Purpose |
|---|---|---|
| `NOTIFICATION_VIEW_TOAST` | Main → View | Show a toast notification |
| `NOTIFICATION_VIEW_HISTORY` | Main → View | Send notification list |
| `NOTIFICATION_VIEW_SHOW_TOAST` | Main → View | Unhide toast area |
| `NOTIFICATION_VIEW_HIDE_TOAST` | Main → View | Hide + clear toast queue |
| `NOTIFICATION_VIEW_SHOW_LIST` | Main → View | Open list view |
| `NOTIFICATION_VIEW_HIDE_LIST` | Main → View | Close list view |
| `NOTIFICATION_VIEW_CLICK` | View → Main | User clicked notification → switch tab |
| `NOTIFICATION_VIEW_CLOSE` | View → Main | User closed list |
| `NOTIFICATION_VIEW_MARK_READ` | View → Main | Mark single as read |
| `NOTIFICATION_VIEW_MARK_ALL_READ` | View → Main | Mark all as read |
| `NOTIFICATION_VIEW_GET_HISTORY` | View → Main | Request history refresh |

## Web Page Interception (`notification-preload.ts`)

- Injected into each tab's `WebContentsView` via `webPreferences.preload`
- Gets `tabId` from `additionalArguments` (`--notification-tab-id=`)
- Overrides `window.Notification` using `webFrame.executeJavaScript` in the main world
- Returns a mock `Notification` object to prevent OS-level notification from the renderer
- Sends intercepted data to main process via `contextBridge` → `ipcRenderer.send("WEB_NOTIFICATION", ...)`

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

## Z-Index Layering

| Layer | Z-Index | Managed By |
|---|---|---|
| Tab Layer | 1 | `TabController.attachChildView()` |
| SubWindow | 2 | `SubWindowService.ensureOnTop()` |
| Notification | 3 | `NotificationViewService.ensureOnTop()` |

Notification view is always re-added last via `ensureOnTop()`:
- In `ViewController.attachChildView()` after every tab/sub-window attachment
- Via `SubWindowService.onDidOpen` callback when sub-window opens

## Behaviour by App State

| App State | Toast (in-app) | OS Notification | Added to List |
|---|---|---|---|
| Focused | Yes (top-right, auto-dismiss) | No | Yes |
| Backgrounded | No | Yes (click → switch tab) | Yes |
