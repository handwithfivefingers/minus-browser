# YouTube Embed Plugin — Overhaul

## Problem

The current implementation has functional layout detection and overlay creation but several issues remain:

- **Overlay positioning** uses fixed offsets (`32px`) instead of accurately matching the real YouTube video player element
- **Tab switching** — `hideOverlay()` / `showOverlay()` are commented out; switching tabs doesn't hide the overlay
- **No window controls** — drag-only overlay; missing Minimize, Zoom, Close buttons
- **Edge cases** — redundant overlay creation on repeated navigations, no proper lifecycle on non-YouTube URLs

## Current State

### ✅ Already Done

- `extractVideoId()` from adblocker services — extracts `v` param from YouTube watch URLs
- `BrowserWindow` overlay creation with transparent background
- Video ID passed via URL hash (`#videoId`)
- Drag handle with mouse event tracking (console.log bridge)
- YouTube page JS injection to detect `.html5-video-player` bounds and pause native video
- Window resize listener for repositioning
- `eventStore` listener for `viewChanges` to detect tab switches

### ⚠️ Partial / Broken

| Area | Issue |
|------|-------|
| `hideOverlay()` / `showOverlay()` | Commented out — no-op |
| `destroyOverlay()` | Only resets state, doesn't close the `BrowserWindow` |
| Video wrapper positioning | Offsets by `+32` — doesn't accurately match element position |
| Non-YouTube navigation | Doesn't destroy overlay (`else` branch commented out) |

## Implementation Plan

### Flow

```
1. Extract watch_id
   → onUpdateTargetUrl (dom-ready) fires
   → extractVideoId(url) → "ABC123"

2. Create BrowserWindow
   → If no overlay exists for this tab, create transparent BrowserWindow
   → Set initial bounds at default position (32, 32, 400, 225)

3. Pass watch_id to browser window
   → Load overlay URL with #videoId in hash
   → Overlay reads hash, renders <iframe>

4. Reflect real video wrapper & correct positioning
   → Inject JS to query `.html5-video-player` bounding rect
   → Listen for console-message with __MINUS_YOUTUBE_EMBED_RESIZE__
   → Set BrowserWindow bounds to match the video element bounds (no offset)

5. Handle Edge cases

   5.1 Switch tab → Hide BrowserWindow (video keeps playing)
   5.2 Switch back  → Show BrowserWindow
   5.3 Add Minimize, Zoom, Close buttons in overlay title bar
       - Minimize: hide BrowserWindow only (video keeps playing in background)
       - Zoom: toggle between default size and full viewport size
       - Close: destroy overlay
       - Safe drag: remove listeners properly on unmount
```

### Files & Actions

| File | Action |
|------|--------|
| `src/features/youtubeEmbed/plugin/index.ts` | **EDIT** — fix positioning, hide/show lifecycle, proper cleanup |
| `src/features/youtubeEmbed/overlay/main.tsx` | **EDIT** — add Minimize/Zoom/Close buttons, fix drag cleanup |

### Step 1 — Fix Plugin Positioning & Lifecycle (`plugin/index.ts`)

**Uncomment and fix `hideOverlay()`**:
```ts
private hideOverlay() {
  if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
  this.subWindow.hide();     // was setVisible(false) - use hide()
  this.subWindow.webContents.setBackgroundThrottling(true);
}
```

**Uncomment and fix `showOverlay()`**:
```ts
private showOverlay() {
  if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
  this.subWindow.show();
  this.subWindow.webContents.setBackgroundThrottling(false);
}
```

**Fix video wrapper positioning** — remove `+32` offset in `createOverlay`:
```ts
// Current (wrong):
x: x + 32,
y: y + 32,
width: dx,
height: dy,

// Fixed:
x: x,
y: y,
width: dx,
height: dy,
```

**Fix `destroyOverlay()`** — properly close the BrowserWindow:
```ts
private destroyOverlay() {
  const win = BrowserWindow.getAllWindows()[0];

  if (this.resizeHandler) {
    if (win) win.off("resize", this.resizeHandler);
    this.resizeHandler = null;
  }

  if (this.subWindow) {
    if (!this.subWindow.webContents.isDestroyed()) {
      this.subWindow.webContents.close();
    }
    this.subWindow = null;
  }

  this.taskIds.clear();
  this.currentVideoId = null;
  this.isYouTubeOverrideActive = false;
}
```

**Fix `handleNavigate`** — properly handle non-YouTube URL:
```ts
} else if (this.isYouTubeOverrideActive) {
  this.destroyOverlay();
}
```

**Fix duplicate overlay** — the `taskIds` map currently maps `tabId → BrowserWindow` but is checked before `videoId` extraction; refactor to check if this tab already has an overlay and reuse it:
```ts
if (videoId) {
  if (videoId === this.currentVideoId && this.subWindow) {
    this.showOverlay();
    return;
  }
  // ...create overlay
}
```

### Step 2 — Add Window Controls to Overlay (`overlay/main.tsx`)

Replace the drag-only title bar with three buttons:

```tsx
// Minimize → console.log(MINIMIZE_PREFIX)
// Zoom     → console.log(ZOOM_PREFIX)  
// Close    → console.log(CLOSE_PREFIX)
```

**In plugin**, listen for these console-messages:

| Prefix | Action |
|--------|--------|
| `__MINUS_YOUTUBE_EMBED_MINIMIZE__` | `this.hideOverlay()` |
| `__MINUS_YOUTUBE_EMBED_ZOOM__` | Toggle bounds between `{400,225}` and full viewport |
| `__MINUS_YOUTUBE_EMBED_CLOSE__` | `this.destroyOverlay()` |

**Drag safety** — use `AbortController` or ensure `removeEventListener` is called in the `useEffect` cleanup to prevent stale listeners after unmount.

### Step 3 — Ensure `viewChanges` eventStore Works for Hide/Show

The constructor already listens on `eventStore` for `viewChanges`. In ViewController:

- `attachChildView` broadcasts `"viewChanges"` with the active view
- `detachChildView` broadcasts `"viewChanges"` with `undefined`

The plugin's listener compares `activeView.webContents.id` to `subWindow.webContents.id`. Since `subWindow` is a `BrowserWindow` (not a `WebContentsView`), this comparison will never match → the overlay would always be hidden when the tab is active.

**Fix**: Remove the `.webContents.id` comparison; instead track the owning tab's `webContents.id` so we can match when the tab becomes active/inactive:

```ts
constructor(...) {
  eventStore.listen("viewChanges", (view: WebContentsView | undefined) => {
    this.activeView = view || null;
    if (this.ownerTabWebContentsId && this.activeView?.webContents.id === this.ownerTabWebContentsId) {
      this.showOverlay();
    } else {
      this.hideOverlay();
    }
  });
}
```

Store `ownerTabWebContentsId` when the overlay is created for a tab.

### Data Flow

```
1. User navigates to youtube.com/watch?v=ABC123
   → dom-ready fires → handleNavigate
   → extractVideoId → "ABC123"
   → Create BrowserWindow overlay with #ABC123 in hash
   → Inject JS to find .html5-video-player bounds
   → Overlay renders <iframe src=".../ABC123?autoplay=1&mute=1">
   → YouTube page reports bounds via console.log
   → Plugin sets BrowserWindow bounds to match video element

2. User switches tab
   → eventStore broadcasts "viewChanges" with different view
   → Plugin.hideOverlay() → BrowserWindow.hide()

3. User switches back to YouTube tab
   → eventStore broadcasts "viewChanges" with matching view
   → Plugin.showOverlay() → BrowserWindow.show()

4. User clicks Minimize
   → Overlay console.log(MINIMIZE_PREFIX)
   → Plugin receives → BrowserWindow.hide()

5. User clicks Zoom
   → Overlay console.log(ZOOM_PREFIX)
   → Plugin toggles between 400x225 and full viewport

6. User clicks Close
   → Overlay console.log(CLOSE_PREFIX)
   → Plugin.destroyOverlay() → close BrowserWindow

7. User navigates to google.com
   → handleNavigate → no videoId → destroyOverlay()
```
