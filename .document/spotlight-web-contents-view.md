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
| `src/features/spotlight/service/index.ts` | Rewrite to create/manage `WebContentsView` instead of `BrowserWindow`. Store main window ref. Remove bounds file I/O. Add `activeTabId` to `SpotlightOpenPayload`. |
| `src/features/spotlight/controllers/index.ts` | Add `init(mainWindow)` to pass main window ref to service. |
| `src/features/spotlight/overlay/main.tsx` | Add `activeTabId` state. Replace `CREATE_TAB` with `VIEW_CHANGE_URL` to navigate current tab. Restructure actions to always include "Create new tab" option. |
| `src/features/system/controller/viewController.ts` | Call `spotlightController.init(this.window)` before `warmup()`. Pass `activeTabId` when opening spotlight. |

### No changes needed

| File | Reason |
|------|--------|
| `src/features/spotlight/route-init.ts` | Singleton pattern unchanged. |
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
- Pass `activeTabId: this.tabController?.activeTab?.id` when calling `spotlightController.open()`

### Step 4: Update Spotlight to handle URL changes in current tab

**Problem:** Spotlight always created a new tab (via `CREATE_TAB`) when typing a URL or search query — it couldn't change the current tab's URL.

**Solution:** Spotlight now navigates the current tab using `VIEW_CHANGE_URL` with the active tab's ID.

**Data flow:**
1. `ViewController.openSpotlight()` includes `activeTabId` in the payload
2. `SpotlightService` passes `activeTabId` via `SPOTLIGHT_OPEN` IPC message
3. Spotlight overlay stores `activeTabId` in state
4. When user selects a URL/search action, `navigateCurrentTab(url)` helper emits `VIEW_CHANGE_URL` with `{ id: activeTabId, url }`
5. `ViewController.handleURLChange()` catches this and calls `currentTab.webContents.loadURL(url)`

**Fallback:** If `activeTabId` is not available (edge case), falls back to `CREATE_TAB`.

**Scoring priority** (sorted by score, higher = first):

| Score | Action | Condition |
|-------|--------|-----------|
| 110 | "Create new tab" | No query typed |
| 100–95 | Tab matches (when no query) | No query typed |
| **95** | **"Go to" (navigate current tab)** | **Domain typed** |
| 90–85 | Tab matches (when query exists) | Query typed |
| 85 | "Open in new tab" | Domain typed |
| 70 | "Search" (navigate current tab) | Non-domain query |
| 55 | "Search in new tab" | Non-domain query |
| 40 | "Create new tab" | Query typed |

**Result:** Pressing Enter always does the most useful default:
- Typed a domain → navigates current tab (95)
- Typed search text → searches in current tab (70)
- No query → creates a new tab (110)
- Tab matches appear below "Go to" but above "Open in new tab"

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

### URL change behavior

9. Type a domain (e.g. `example.com`) and press Enter → current tab navigates to `https://example.com`
10. Type a search query (e.g. `hello world`) and press Enter → current tab navigates to Google search
11. Type a domain and select "Open in new tab" → creates a new tab with that URL
12. Type a search and select "Search in new tab" → creates a new tab with search results
13. Select "Create new tab" from actions → opens a blank tab
14. Select a tab match → switches to that tab
15. `VIEW_CHANGE_URL` with invalid/missing `activeTabId` → falls back to `CREATE_TAB`
