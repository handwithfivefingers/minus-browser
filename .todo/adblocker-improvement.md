# Adblocker Improvement Plan

## 1. Clear Cache

- Add IPC handler `@adb/clear-cache` to delete `{userData}/adblock-cache/` directory
- Add IPC handler `@adb/get-cache-info` to return cache size, timestamp, filter count
- Add "Clear Cache" + "Force Update Now" buttons in UI
- Cache info display (size, last updated)

## 2. Improve UI

- Group filter lists by category (EasyList, AdGuard, uBlock, Brave, Regional, etc.)
- Show blocking stats (total blocked requests, cosmetic filters applied)
- Show per-filter update status / last fetched timestamp
- Add loading spinner during engine initialization
- Show filter count per category with collapse/expand
- Better visual hierarchy and spacing

## 3. Add Custom Filter

- Add `customFilters: string[]` field to extension config
- IPC handlers: `@adb/get-custom-filters`, `@adb/set-custom-filters`
- Store custom filters at `{userData}/adblock-cache/custom-filters.json`
- Parse and merge custom filters into engine using `FiltersEngine.parseFilters()`
- UI: `<textarea>` for pasting ABP/uBlock-format rules
- Syntax hint and "Save Custom Filters" button

## 4. Auto Update

- Add `startAutoUpdate(intervalMs?)` / `stopAutoUpdate()` methods
- Default interval: 6 hours
- Compare `Last-Modified` headers to avoid unnecessary re-downloads
- On update: rebuild engine, re-serialize cache, notify renderer
- IPC: `@adb/get-auto-update-status` (next check, last check, interval)
- Config: `adblockAutoUpdate` toggle + interval selector in UI

## Implementation Order

1. Auto Update (backend + config)
2. Clear Cache (backend + UI)
3. Custom Filters (backend + UI)
4. Improve UI (frontend)
