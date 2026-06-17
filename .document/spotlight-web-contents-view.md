# Action Plan: Spotlight WebContentsView Migration

## Problem

Spotlight opens as a separate `BrowserWindow` (frameless, transparent, always-on-top). When the main `BrowserWindow` moves to another screen, the spotlight window stays on the primary screen because it's an independent OS window with its own position state.

The previous fix (repositioning in `openSpotlight`) is fragile — it only repositions at open time, doesn't handle live window moves, and still uses a separate OS window.

## Goal

Replace the separate `BrowserWindow` with a `WebContentsView` attached to the main window's `contentView`. This follows the same pattern used by vault and translate overlays.

## Benefits

- Spotlight always follows the main window (same screen, same position)
- Consistent architecture with vault/translate (`WebContentsView` + `contentView.addChildView`)
- No separate OS window management (no `skipTaskbar`, `alwaysOnTop`, window-level focus)
- Simpler lifecycle — no bounds persistence needed
- No `BrowserWindow.getFocusedWindow()` dependency

---

## Implementation

### Files to modify

| File | Changes |
|------|---------|
| `src/features/spotlight/service/index.ts` | Rewrite to create/manage `WebContentsView` instead of `BrowserWindow`. Store main window ref. Remove bounds file I/O. |
| `src/features/spotlight/controllers/index.ts` | Add `init(mainWindow)` to pass main window ref to service. |
| `src/features/system/controller/viewController.ts` | Call `spotlightController.init(this.window)` before `warmup()`. |

### No changes needed

| File | Reason |
|------|--------|
| `src/features/spotlight/route-init.ts` | Singleton pattern unchanged. |
| `src/features/spotlight/overlay/main.tsx` | React overlay uses `window.api` IPC — works identically from any `WebContentsView`. |
| `vite.spotlight.renderer.config.ts` | Build config unchanged. |
| `forge.config.ts` | Vite renderer registration unchanged. |
| `src/preload.ts` | IPC bridge (`window.api`) works for any `WebContentsView`. |

---

### Step 1: Rewrite `SpotlightService` (`src/features/spotlight/service/index.ts`)

**Current:**
- Creates a separate `BrowserWindow` with saved bounds
- Uses `window.blur` to detect close
- Manages bounds file (`spotlight-bounds.json`)

**New:**
- Stores injected `mainWindow: BrowserWindow` reference
- Creates a single `WebContentsView` on warmup
- On open: sets view bounds to fill main window, attaches to `contentView`, sends IPC, focuses
- On close: removes from `contentView`, detaches blur listener
- Replaces `window.blur` with main window `blur` event (user switches app)
- Adds `resize` listener on main window to keep view bounds in sync
- Removes all bounds file management (`loadBounds`, `saveBounds`, `boundsPath`)

Key API mapping:

| BrowserWindow | WebContentsView |
|---------------|-----------------|
| `new BrowserWindow(opts)` | `new WebContentsView(webPrefs)` |
| `win.show()` | `win.contentView.addChildView(view)` |
| `win.hide()` | `win.contentView.removeChildView(view)` |
| `win.focus()` | `view.webContents.focus()` |
| `win.getBounds()` | `view.getBounds()` / `win.getBounds()` |
| `win.setBounds()` | `view.setBounds()` |
| `win.on("blur", cb)` | `mainWindow.on("blur", cb)` |
| `win.webContents.send()` | `view.webContents.send()` (same) |

### Step 2: Modify `SpotlightController` (`src/features/spotlight/controllers/index.ts`)

- Add `init(mainWindow: BrowserWindow)` method
- Call `this.service.init(mainWindow)`

### Step 3: Modify `ViewController` (`src/features/system/controller/viewController.ts`)

- In constructor or `init()`, add `this.spotlightController.init(this.window)` before `warmup()`

---

## Edge Cases & Risks

| Edge Case | Handling |
|-----------|----------|
| Main window resized while spotlight open | Resize listener updates view bounds |
| User switches to another app while spotlight open | Main window `blur` event closes spotlight (same behavior as before) |
| Spotlight opened before warmup complete | `warmup()` creates and loads URL; `openSpotlight()` checks view exists |
| Multiple rapid open/close | `close()` already guards with `isOpen` flag |
| App quit while spotlight open | `destroy()` cleans up view |
| Main window not available | `init()` must be called before `warmup()`/`open()` — guarded by null checks |
| React overlay emits SPOTLIGHT_CLOSE via IPC | Same flow: `ipcMain.on("send")` → `ViewController.closeSpotlight()` → `controller.close()` → view cleanup |
| Click outside spotlight panel | React backdrop `onMouseDown` handles it (same as before) |

## Verification

1. Open spotlight → appears as an overlay inside main window (no separate OS window)
2. Move main window to another screen → spotlight follows (it's a child view)
3. Resize main window while spotlight open → overlay resizes with window
4. Press Escape → spotlight closes cleanly
5. Click backdrop → spotlight closes
6. Switch to another app (Cmd+Tab) → spotlight closes (main window blur)
7. Open spotlight repeatedly → no memory leaks, single view reused
8. Quick warmup → pre-loading still works (view created and URL loaded early)
