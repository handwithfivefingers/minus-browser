# YouTube Embed Plugin

## Overview

Detects YouTube watch URLs in tabs and creates a floating overlay window that plays the video as an embedded iframe, allowing users to watch YouTube while browsing other sites.

## Architecture

### Files

| File                                           | Role                                          |
| ---------------------------------------------- | --------------------------------------------- |
| `src/features/youtubeEmbed/index.ts`           | Entry — re-exports plugin                     |
| `src/features/youtubeEmbed/plugin/index.ts`    | Core logic — URL detection, overlay lifecycle |
| `src/features/youtubeEmbed/overlay/main.tsx`   | React overlay app — iframe + drag handle      |
| `src/features/youtubeEmbed/overlay/index.html` | Overlay HTML shell                            |
| `src/shared/constants/ipc/youtube-embed.ts`    | IPC channel constants                         |
| `vite.youtube-embed.renderer.config.ts`        | Vite config for overlay bundle                |

### Dependencies

- `src/features/adblocker/services/youtube-embed.ts` — provides `extractVideoId()`, `isYouTubeWatchUrl()`, `buildEmbedDataUrl()`
- `src/main/core/stores/minusEventEmitter.ts` — `eventStore` for view changes and drag events
- `src/shared/types/tab-plugin.d.ts` — `ITabPlugin`, `ITabLifecycleHooks` interfaces

## Plugin (`plugin/index.ts`)

### Class: `YoutubeEmbeddingPlugin`

Implements `ITabPlugin`. Registered per-tab in `Tab.registerPlugin()` (`src/features/tabs/models/tab.ts:210`).

### Constructor

- Listens on `eventStore` for `"viewChanges"` to track `activeView`
- Receives an `emitToRenderer` callback (wired to tab's `eventEmitter`)

### Hooks

- `onUpdateTargetUrl` — wired to `dom-ready` event; handles URL detection
- `onDestroy` — cleanup on tab destruction

### Overlay Lifecycle

1. **URL detection**: On `dom-ready`, calls `webContents.getURL()` + `extractVideoId()`.
2. **Overlay creation**: Creates a separate `BrowserWindow` (transparent, no frame) positioned at `(32, 32)` with fixed `400x225` size.
3. **Video ID passing**: Passes video ID via URL hash (`#videoId`) to the overlay HTML.
4. **Ad suppression**: Injects JS into the YouTube page that pauses the native video player every 500ms and reports element bounds via `console.log`.
5. **Position syncing**: Listens on `console-message` from both the tab and overlay:
   - `__MINUS_YOUTUBE_EMBED_RESIZE__:` — from YouTube page, adjusts overlay position to match player element
   - `__MINUS_YOUTUBE_EMBED_DRAG__:` — from overlay, moves window by delta
6. **Window resize**: Adds listener on main `BrowserWindow` `"resize"` to reposition overlay.
7. **Teardown**: `destroyOverlay()` sets `currentVideoId = null`, `isYouTubeOverrideActive = false`. Actual window cleanup is commented out.

### Current Limitations

- Uses `BrowserWindow` instead of `WebContentsView` (no proper child view management)
- Communication via `console.log` / `console-message` events — no IPC bridge
- No preload script
- Doesn't redirect main tab to `about:blank` (YouTube tab still loads ads)
- No proper cleanup — redundant overlays can pile up
- ViewController has no YouTube embed awareness

## Overlay (`overlay/main.tsx`)

- React app rendered via `createRoot`
- Reads `videoId` from `window.location.hash`
- Renders an `<iframe>` pointing to `https://www.youtube.com/embed/{videoId}?autoplay=1&mute=1...`
- Drag handle at top: `mousedown`/`mousemove`/`mouseup` -> logs `__MINUS_YOUTUBE_EMBED_DRAG__:{dx,dy}` to console

## IPC Constants (`shared/constants/ipc/youtube-embed.ts`)

```ts
export const YOUTUBE_EMBED_RENDERER_EVENT = {
  WATCH_ID: 'YOUTUBE_EMBED_WATCH_ID',
  CLOSE: 'YOUTUBE_EMBED_CLOSE',
} as const
```

These are defined but not yet used — the plugin still uses console-message based communication.

## Data Flow (Current)

```
URL change / dom-ready
  → Plugin.onUpdateTargetUrl fires
  → extractVideoId(url)
  → Creates BrowserWindow overlay with #videoId in hash
  → Injects JS into YouTube tab to pause video + report bounds
  → Overlay reads hash, renders iframe
  → Drag events: overlay console.log → plugin console-message → setBounds
```

## Build

Overlay is built as a separate Vite entrypoint (`vite.youtube-embed.renderer.config.ts`):

- Root: `src/features/youtubeEmbed/overlay`
- Output: `.vite/renderer/youtube_embeded/`
- Dev server URL injected via `YOUTUBE_EMBED_VITE_DEV_SERVER_URL` global
