# Extension Feature — Integration & Fixes

## What was done

### TypeScript refactoring (`src/features/extension/`)
- Created `apiSpecs.ts` — shared `spec`, `FUNCTION`, `EVENT`, `SETTING`, `makeEvent` extracted from `preload.ts` to avoid duplication across `preload.ts`, `preload-raw.ts`, `extendedExtension.ts`
- **Bugfix `tabs.ts`**: `this.tabs.getRaw(tabId)` was calling `Map.getRaw()` (doesn't exist) instead of `this.getRaw()`; added `await` for async `getRaw` calls; fixed `removeListener` missing handler args
- **Bugfix `tabs.ts`**: added missing imports (`webContentsToTab`, `TAB_QUERY_PROPERTIES`)
- **Bugfix `extendedExtension.ts`**: added missing imports (`ipcMain`, `WebContents`, `webContents`, `DEFAULT_ON_CREATE_TAB`, spec constants); fixed `PRELOAD_PATH` reference; fixed `WebContents.getAllWebContents()` → `webContents.getAllWebContents()`; fixed `removeHandler` arg count
- **Bugfix `contextMenus.ts`**: added missing `MenuItem` and `webContentsToTab` imports
- **Bugfix `webNavigation.ts`**: `IWebNavigation` interface typed `tabs` as `Map<string, WebContents>` instead of `Tabs` — fixed
- **Cleanup `debugger.ts`**: removed unused imports/constants
- **Typed `browserAction.ts`**: added explicit type annotations to all method params
- **Extracted `PRELOAD_PATH`** into `constants/index.ts`

### Extension preload as standalone build entry
- Removed `export * from "./preload"` from `index.ts` (preload scripts import renderer-only Electron modules and cannot be bundled into main process)
- Created `vite.extension-preload.config.ts`
- Added preload entry in `forge.config.ts` (builds to `.vite/build/extension-preload.js`)

### Integration into application (`src/main.ts`)
- `ExtendedExtensions` instantiated **before** `createWindow()` to capture all `web-contents-created` events (restored tabs, background pages, etc.)
- `onCreateTab` callback wired after `ViewController.ready()` — creates real browser tabs via `TabController.addNewTab()`, attaches the view, loads URL, syncs to renderer
- Test extension loaded from `extensions/test-extension/v0/`

### Test extension (`extensions/test-extension/v0/`)
- Changed manifest from v3 `service_worker` to v2 `background.scripts` (Electron primarily supports v2)
- Added automatic detection: `session.on("extension-loaded")` fires → polls `getBackgroundPage(id)` → opens DevTools on background page in dev mode

### AdBlock extension crash fix
- `chrome.privacy.network.webRTCIPHandlingPolicy.{get,set,clear}` proxies forwarded to `$$chrome.privacy…` which was `undefined` in `rawAPI`
- Added `createSettingStub()` in both `preload.ts` and `preload-raw.ts` — for every `SETTING` in the spec, populates `rawAPI` with `.get()` (returns `{ value: null }`), `.set()`, `.clear()` methods
- Updated `extendedExtension.ts` `attachAPI` to skip object-type entries instead of throwing

## How it works

```
Extension background page
  → preload.ts injects chrome.* APIs via contextBridge
  → chrome.tabs.create() etc. send IPC to main process
  → ExtendedExtensions.attachFunctionAPI/attachListenerAPI handles IPC
  → Delegates to Tabs, Debugger, BrowserActions, ContextMenus, WebNavigation
  → onCreateTab callback creates real browser tabs via TabController
```

## Files changed/created

| File | Action |
|------|--------|
| `src/features/extension/apiSpecs.ts` | **NEW** |
| `src/features/extension/index.ts` | modified |
| `src/features/extension/preload.ts` | modified |
| `src/features/extension/preload-raw.ts` | modified |
| `src/features/extension/models/extendedExtension.ts` | modified |
| `src/features/extension/models/tabs.ts` | modified |
| `src/features/extension/models/webNavigation.ts` | modified |
| `src/features/extension/models/debugger.ts` | modified |
| `src/features/extension/models/contextMenus.ts` | modified |
| `src/features/extension/models/browserAction.ts` | modified |
| `src/features/extension/constants/index.ts` | modified |
| `src/features/extension/utils/index.ts` | modified |
| `src/main.ts` | modified |
| `forge.config.ts` | modified |
| `vite.extension-preload.config.ts` | **NEW** |
| `extensions/test-extension/v0/manifest.json` | modified |
| `.todo/extension.md` | **NEW** |

## To run

```bash
npm start
```

Extension loads automatically. Terminal logs show:
```
Extension loaded: Example Extension <id> chrome-extension://<id>/
Background page running: chrome-extension://<id>/_generated_background_page.html
```
