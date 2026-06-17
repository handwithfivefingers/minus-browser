# Adblocker Fix: Preload-Based Early Injection with DOMMonitor

## Problem

Google Ads and YouTube midroll ads are not consistently blocked by the custom `FiltersEngine`-based implementation. Root cause: cosmetic filters (CSS hiding + scriptlets) were injected via `did-start-loading` / `did-finish-load` events, which fire **after** page scripts have already started executing. Scriptlets meant to neutralize anti-adblock detection run too late.

Additionally, `@ghostery/adblocker-electron` cannot be used because its `preload_path` resolution (`createRequire(import.meta.url).resolve(...)`) fails when Vite bundles the code, and fails again in production ASAR packaging where `createRequire` is not ASAR-aware.

## Solution: Custom Preload Script + IPC

Instead of using `@ghostery/adblocker-electron`, we implement the same architecture ourselves:

1. **`adblocker-preload.ts`** — A preload script registered via `session.registerPreloadScript()` that:
   - Runs **immediately** (before any page code) in every frame
   - Calls `ipcRenderer.invoke("@adb/inject-cosmetic-filters")` for initial cosmetic injection
   - Sets up `DOMMonitor` (from `@ghostery/adblocker-content`) on `DOMContentLoaded` to watch for DOM mutations
   - Reports new classes/ids/hrefs back to the main process via IPC for dynamic element hiding

2. **IPC Handlers in the main process** — Handle cosmetic filter requests from the preload:
   - `@adb/inject-cosmetic-filters` — Calls `engine.getCosmeticsFilters()`, injects CSS via `event.sender.insertCSS()`, executes scriptlets via `event.sender.executeJavaScript()`
   - `@adb/is-mutation-observer-enabled` — Returns `true` to enable the MutationObserver

3. **Network blocking** — Kept as-is via `session.webRequest.onBeforeRequest` with `FiltersEngine.match()`

### Why this works

- The preload script is **built as part of the app** (Vite entry with `target: "preload"`), so its path is `path.join(__dirname, "adblocker-preload.js")` — always resolvable inside or outside ASAR
- No dependency on `createRequire` or `import.meta.url` — the preload path is a simple filesystem path
- `DOMMonitor` from `@ghostery/adblocker-content` provides the same dynamic element detection as Ghostery's `ElectronBlocker`

## Files Changed

| File | Change |
|------|--------|
| `src/features/adblocker/adblocker-preload.ts` | **New** — Preload script with DOMMonitor, injects cosmetic filters via IPC |
| `vite.adb-preload.config.ts` | **New** — Vite config for building the preload script |
| `forge.config.ts` | Added build entry for `adblocker-preload.ts` with `target: "preload"` |
| `vite.main.config.ts` | Reverted `build.rollupOptions.external` (no longer needed) |
| `src/features/adblocker/controllers/index.ts` | **Rewritten** — Registers preload via `session.registerPreloadScript()`, handles IPC for cosmetic injection, keeps `FiltersEngine` for network blocking. Removed manual `injectCosmeticFilters()` in favor of preload+IPC |
| `src/features/adblocker/plugin/index.ts` | Simplified — removed `did-start-loading`/`did-finish-load` listeners (cosmetic injection now handled by preload). Kept YouTube `did-navigate` hook |

## Architecture

```
Session Startup
  │
  ├─ session.registerPreloadScript({ filePath: "adblocker-preload.js" })
  ├─ session.webRequest.onBeforeRequest(...)    ← network blocking
  └─ session.webRequest.onHeadersReceived(...)  ← CSP injection

Frame Load
  │
  ├─ [preload runs immediately]
  │   ├─ ipcRenderer.invoke(@adb/inject-cosmetic-filters, url)
  │   └─ [on DOMContentLoaded]
  │       ├─ DOMMonitor.queryAll(window)
  │       └─ DOMMonitor.start(window) ← MutationObserver
  │
  ├─ [IPC handler in main process]
  │   ├─ engine.getCosmeticsFilters(...)
  │   ├─ event.sender.insertCSS(styles)
  │   └─ event.sender.executeJavaScript(scripts)
  │
  └─ [on DOM mutation]
      └─ DOMMonitor detects new classes/ids → IPC update
```

## Dependencies

- `@ghostery/adblocker` — `FiltersEngine` for network matching and cosmetics
- `@ghostery/adblocker-content` — `DOMMonitor` for DOM mutation detection (transitive dep of adblocker)
- `tldts-experimental` — URL parsing for `getCosmeticsFilters` (transitive dep of adblocker)
- `@ghostery/adblocker-electron` — **Removed** (was not used, had ASAR preload_path issues)
- `@ghostery/adblocker-electron-preload` — **Removed** (was not used)

## Debugging

Call `blocker.onShowADBlockRequest()` in the plugin to log `request-blocked`, `request-redirected`, etc. events to the Electron console.

```ts
// In plugin's register():
blocker.onShowADBlockRequest();
```

## YouTube Midroll Ads

Midroll ads are NOT handled by the adblocker engine (they're not network requests). They're handled by the `SkipADSBlock()` and `SponsorBlock()` scripts injected via `AdblockService.injectYoutubeAdblockSponsor()`. If midroll ads still appear:

1. Verify the `did-navigate` hook fires for YouTube URLs
2. Check YouTube's DOM hasn't changed — update selectors in `services/index.ts` if needed
3. The adblocker preload injects cosmetic filters that may hide YouTube ad containers earlier
