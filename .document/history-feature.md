# History Feature

## Problem

No browser history existed. The `History` controller was a bare skeleton — it read from `history.json` but had no CRUD methods, no IPC wiring, no tab tracking, and no UI.

## Implementation

### Files created

| File | Purpose |
|------|---------|
| `src/core/controller/history/types.ts` | `IHistoryEntry` interface |
| `src/core/controller/history/historyRoute.ts` | IPC channel → handler mapping + `historyController` singleton |
| `src/features/ui/pages/history/index.tsx` | History UI page (search, date groups, delete, clear) |

### Files modified

| File | Changes |
|------|---------|
| `src/core/controller/history/historyController.ts` | Full CRUD: `addEntry`, `getAll`, `search`, `getRecent`, `deleteEntry`, `clearAll`; dedup by URL; `cleanOldEntries()` with configurable `retentionDays`; periodic cleanup every hour; added `updateEntryMetadata()` for retroactive title/favicon correction |
| `src/core/controller/history/index.ts` | Barrel re-export |
| `src/shared/constants/ipc.ts` | Added `GET_HISTORY`, `SEARCH_HISTORY`, `DELETE_HISTORY`, `CLEAR_HISTORY`, `GET_RECENT_HISTORY` |
| `src/core/controller/viewController.ts` | Spread `HistoryRoute` into `invokeHandlers`; init `historyController`; pass history to spotlight; wire retention setting on load; **fix**: check `isAlive` after `show()` in `handleShowViewById` to prevent double `createView` on hibernated tabs |
| `src/features/tabs/models/tab.ts` | Import `historyController`, call `addEntry()` on `did-navigate` / `did-navigate-in-page` (skips `about:blank`); **fix**: `updateTitle()`/`updateFavicon()` now call `updateEntryMetadata()` to correct stale metadata; **fix**: removed stale `isMainFrame` guard from `did-navigate` (Electron 42 removed the param, causing `addEntry` to never fire); **fix**: `updateUrl` sends `{ url }` instead of `{ title }` to renderer |
| `src/core/controller/commandController.ts` | Added "History" menu item (`CmdOrCtrl+Y`) → sends `NAVIGATE_HISTORY` to renderer |
| `src/features/ui/constants/routes.tsx` | Added `/history` route |
| `src/features/ui/components/sidebar/index.tsx` | Added `IconHistory` nav link in `SubMenuItem` |
| `src/features/ui/pages/layout.tsx` | Added `NAVIGATE_HISTORY` IPC listener → navigates to `/history` |
| `src/shared/types/theme.d.ts` | Added `historyRetentionDays?: string` to `IUserInterface` |
| `src/features/ui/interfaces/minusTheme.d.ts` | Added `setHistoryRetentionDays` action |
| `src/features/ui/stores/useMinusTheme.tsx` | Default `"30"`, `setHistoryRetentionDays`, included in `saved()` payload |
| `src/features/ui/pages/setting/components/Interface.tsx` | History settings card with retention days input |
| `src/features/ui/pages/history/index.tsx` | Added 3-second auto-refresh interval and manual refresh button (`IconRefresh`) |
| `src/features/spotlight/controllers/index.ts` | Accepts `history?: IHistoryEntry[]` in `open()` |
| `src/features/spotlight/service/index.ts` | Sends `GET_HISTORY` to overlay |
| `src/features/spotlight/overlay/main.tsx` | Displays history entries in search results with `IconClock` |
| `src/interface.d.ts` | Added `NAVIGATE_HISTORY`, `GET_HISTORY` to listener channels |

### Architecture

**Backend:**
- `History` class in `src/core/controller/history/` — CRUD on `history.json` via `StoreManager`
- Singleton `historyController` exported from `historyRoute.ts`
- Direct import into `Tab` model for navigation recording
- Debounced save (500ms). Dedup by URL (increments `visitCount`, updates timestamp).
- Auto-cleanup on init + every hour based on `retentionDays` (default 30, configurable via settings)
- `updateEntryMetadata(url, title?, favicon?)` retroactively corrects metadata when `page-title-updated` / `page-favicon-updated` fire after `did-navigate`

**IPC:**
- 5 invoke channels: `GET_HISTORY`, `SEARCH_HISTORY`, `DELETE_HISTORY`, `CLEAR_HISTORY`, `GET_RECENT_HISTORY`
- `NAVIGATE_HISTORY` renderer event for menu/shortcut → navigates to `/history`
- `GET_HISTORY` renderer event for spotlight overlay

**UI:**
- History page at `/history` with search, date groups (Today/Yesterday/Last 7 Days/Older), per-entry delete, clear all
- Auto-refresh every 3s while on the page + manual refresh button
- Sidebar nav link with `IconHistory`
- Keyboard shortcut `CmdOrCtrl+Y`
- History section in System Settings for retention days
- Spotlight overlay shows recent history entries in search results

**Navigation tracking:**
- Hooked into `Tab.registerCommonEvent()` on `did-navigate` (main frame only, Electron 42+ no `isMainFrame` param) and `did-navigate-in-page` (with `isMainFrame` guard for SPA pushState/hash changes)
- Skips `about:blank` URLs
- Records URL at navigation time; title and favicon are corrected retroactively via `updateEntryMetadata()` when `page-title-updated` / `page-favicon-updated` fire

### Bugs fixed (2026-06-19)

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| History entries never created | `did-navigate` handler declared 5 params; Electron 42 passes only 4 → `isMainFrame` always `undefined` → guard never passed | Removed `isMainFrame` param and guard; `did-navigate` only fires for main frame |
| Stale title in history entries | `did-navigate` fires before `page-title-updated`, so `this.title` was the previous page's title | `updateTitle()` calls `historyController.updateEntryMetadata(this.url, this.title)` |
| Stale/missing favicon in history | `page-favicon-updated` fires after `did-navigate`; favicon was always empty | `updateFavicon()` calls `historyController.updateEntryMetadata(pageUrl, undefined, this.favicon)` |
| `updateUrl` corrupts renderer tab state | Sent `{ title: this.url }` — wrote URL into renderer's title field | Changed to `{ url: this.url }` |
| Double `createView` on hibernated tabs | `handleShowViewById` precomputed `wasNotAlive` before `show()`; for hibernated tabs, `show()` → `wake()` already creates a view, then stale flag triggered a second `createView()` | Check `isAlive` after `show()` |
| History page never refreshes | Fetched once on mount with no polling | Added 3s interval + manual refresh button |

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Rapid navigation (same URL) | Dedup — increment `visitCount`, not new entry |
| Empty history | Empty state with `IconClock` illustration |
| Concurrent tab navigation | Each tab calls `addEntry` independently; synchronous in-memory + debounced save |
| App crash between saves | Atomic writes via `StoreManager` (temp file then rename) |
| `about:blank` navigation | Skipped explicitly in event handlers |
| Stale title at navigation time | Corrected retroactively via `updateEntryMetadata` on `page-title-updated` |
| Stale favicon at navigation time | Corrected retroactively via `updateEntryMetadata` on `page-favicon-updated` |
| Multiple tabs navigating to same URL | Dedup — increments `visitCount`, updates timestamp |

## Future Considerations

- Sync history across devices
- Export/import history
- History sidebar panel (vs full page)
- Private mode flag to skip recording
