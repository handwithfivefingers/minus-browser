# Merge Overlay Views into Single Sub-Window

## Goal

Replace 5 separate `WebContentsView` overlay instances (spotlight, vault, translate, userscript, tabgroup) with **1 shared `WebContentsView`** that contains a single React app with hash-based routing for each feature.

## Why

- Eliminates 5 Vite builds → 1 build
- Shared state, shared dependencies, smaller bundle
- Simpler window management in ViewController
- Faster feature development

## Architecture

```
main_window (BrowserWindow)
└── sub_window (WebContentsView — single React app)
    ├── /spotlight
    ├── /vault
    ├── /translate
    ├── /userscript
    └── /tabgroup
```

IPC handlers for all 5 features live in a centralized module:

```
src/features/sub-window/ipc/
├── index.ts                        ← barrel export
├── vault-handlers.ts              ← invoke handlers → VaultController/PasswordController
├── translate-handlers.ts          ← invoke handlers → TranslateController
├── userscript-handlers.ts         ← invoke handlers → UserScriptController
├── spotlight-handlers.ts          ← invoke + emit handlers → SpotlightController
└── tabgroup-handlers.ts           ← invoke + emit handlers → TabGroupController
```

ViewController imports all handlers from the single barrel and spreads them into its `invokeHandlers`/`listenerHandlers` maps, replacing individual route-init imports.

## Registry Pattern

Each feature self-registers by exporting an overlay descriptor from a well-known file:

```
src/features/spotlight/overlay.register.ts
  → register({ path: "/spotlight", component: SpotlightPage, ... })

src/features/vault/overlay.register.ts
  → register({ path: "/vault", component: VaultPage, ... })
```

Sub-window imports all registered overlays at the top of `main.tsx`:

```
src/features/sub-window/
├── registry.ts   ← register() / getRegistered() API, Map-based
├── index.html
├── main.tsx      ← imports all overlay.register, builds hash router, listens for NAVIGATE/PAYLOAD
├── routes.tsx    ← builds routes from registry entries
├── Shell.tsx     ← layout wrapper (header, close btn, backdrop)
├── pages/
│   └── overlay-page.tsx  ← renders registered component inside Shell
└── ipc/          ← centralized IPC handlers (see above)
```

Adding a new overlay feature = create `overlay.register.ts` + add import in `main.tsx`. Zero ViewController coupling.

## Overlay App Contract

Each overlay's `App.tsx` component reads its payload from `sessionStorage` on mount:

```tsx
function App() {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("subWindowPayload");
    if (stored) {
      setPayload(JSON.parse(stored));
      sessionStorage.removeItem("subWindowPayload");
    }
  }, []);

  const handleResolve = useCallback((result: any) => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.RESOLVE, result);
  }, []);

  // ...render UI using payload, call handleResolve when done
}
```

## IPC Handler Contract

Each handler file exports named objects:

```ts
// invoke handlers — registered via ipcMain.handle
export const vaultInvokeHandlers = {
  [SUB_WINDOW_INVOKE.VAULT_GET_PASSWORDS]: async () => { ... },
  [SUB_WINDOW_INVOKE.VAULT_SAVE]: async (_e, data) => { ... },
};

// emit handlers — registered via ipcMain.on
export const spotlightEmitHandlers = {
  [SUB_WINDOW_EMIT.SPOTLIGHT_OPEN]: () => { ... },
};
```

ViewController consumes them:

```ts
import { vaultInvokeHandlers, tabGroupInvokeHandlers, ... } from "~/features/sub-window/ipc";

this.invokeHandlers = {
  ...vaultInvokeHandlers,
  ...tabGroupInvokeHandlers,
  ...
};
```

## Phase 1 — Foundation

1. Create `src/features/sub-window/` with:
   - `index.html` — shell
   - `main.tsx` — React root + hash router, imports all `overlay.register.ts`
   - `routes.tsx` — builds routes from registry entries
   - `registry.ts` — register/getRegistered API
   - `Shell.tsx` — shared overlay chrome (backdrop, close btn)
   - `pages/overlay-page.tsx` — renders registered component inside Shell
2. Add `vite.sub-window.renderer.config.ts`
3. Register in `forge.config.ts` renderer array
4. Create/reuse preload script for sub_window

## Phase 2 — Create overlay.register.ts per Feature

For each feature (spotlight, vault, translate, userscript, tabgroup):

1. Create `src/features/<name>/overlay.register.ts` calling `register()` with route + component
2. Make sure the component can be imported from its existing `overlay/` directory
3. Verify it renders correctly inside the sub_window Shell

## Phase 3 — Centralize IPC Handlers

1. Create `src/features/sub-window/ipc/` with handler modules for all 5 features
2. Each module imports its feature's controller(s) and maps IPC channels to operations
3. **ViewController** replaces individual `route-init` imports with a single import from `sub-window/ipc`
4. Overlay `App.tsx` components rewritten to use `sessionStorage` for payload + `SUB_WINDOW_RESOLVE` IPC for resolving (instead of `console.log` sentinels / `CustomEvent` listeners)
5. Services updated to use `subWindowService.openWithResult()` instead of creating their own `WebContentsView`
6. Delete old `route-init.ts` files (vault, translate, userscript, spotlight)
7. Delete old overlay controller/service files (`TabGroupOverlayController`, `TabGroupOverlayService`)
8. Clean up barrel exports in feature `index.ts` files

## Phase 4 — Cleanup

1. Remove 5 old Vite configs
2. Remove 5 old forge renderer entries
3. Delete 5 old `overlay/` directories (keep feature code, only delete overlay dir)
4. Build, lint, smoke test

## Phase 5 — Bug Fixes

Issues discovered after merging 5 views into 1 shared `WebContentsView`:

### 1. Cmd+K double-fire race

The `CommandOrControl+K` shortcut was handled by **two** competing listeners:
- **Electron ApplicationMenu accelerator** (`commandController.ts:31`) — toggles `subWindowService.isOpen`
- **Sub-window renderer keydown** (`spotlight/overlay/App.tsx:128`) — emits `SPOTLIGHT_CLOSE` IPC

When both fired near-simultaneously, the close IPC could set `isOpen = false` before the accelerator checked it, causing the accelerator to **reopen** spotlight immediately after closing it.

**Fix:** Removed the renderer-side Cmd+K handler from `spotlight/overlay/App.tsx`. The ApplicationMenu accelerator is now the sole handler.

### 2. Stale `this.view` on subsequent opens

After `close()`:
- `this.view` still pointed to the old `WebContentsView` (only removed from contentView, never nullified)
- `this.readyPromise` stayed resolved forever
- On the next `open()`, `warmup()` returned the cached promise → `initView()` was **never called again**
- If `loadURL()` had failed on first init (error swallowed by `.catch(() => {})`), the webContents was stuck on `about:blank` with no `main.tsx` listeners registered
- `this.view.webContents.send()` silently failed — no NAVIGATE/PAYLOAD reached the renderer

**Fix:** `close()` now closes the webContents, nullifies `this.view`, and resets `this.readyPromise`. Next `open()` → `warmup()` → `initView()` creates a fresh `WebContentsView`.

### 3. DevTools window stealing focus on reopen

`initView()` called `this.view.webContents.openDevTools()` (line 81). On the first warmup this was harmless, but after `close()` nullified the view, the **next** `open()` called `initView()` again, opening a new DevTools window. That DevTools window appeared a few ms **after** the blur handler was registered, stealing focus from the main BrowserWindow → `blur` event → `close()` → spotlight closed itself moments after opening.

**Fix:** Removed the debug-only `openDevTools()` call from `initView()`.

### 4. CSS classes missing for overlays outside Vite root

With `root: "src/features/sub-window"` in the Vite config, Tailwind CSS v4's automatic content scanner only scanned files **inside** that directory. Overlay components at `src/features/spotlight/`, `src/features/vault/`, etc. were outside the root, so their Tailwind classes (e.g., `animate-fade-in` in Spotlight) were omitted from the built CSS. Built CSS was 13.6 kB vs the expected ~67 kB.

**Fix:** Added `@source` directives in `src/features/sub-window/assets/styles.css` pointing to all 5 overlay directories, telling Tailwind to scan them explicitly:
```css
@source "../../spotlight/";
@source "../../vault/";
@source "../../translate/";
@source "../../userscript/";
@source "../../tabGroup/";
```

### 5. Build script referencing deleted renderers

`scripts/build-renderers.mjs` still tried to build old renderers (`spotlight_window`, `translate_injection`, `vault_injection`, `userscript_injection`) whose Vite configs no longer existed, causing build failures.

**Fix:** Replaced the 4 old entries with the single `sub_window` entry.

## Files Changed

### New files
- `src/features/sub-window/ipc/vault-handlers.ts`
- `src/features/sub-window/ipc/translate-handlers.ts`
- `src/features/sub-window/ipc/userscript-handlers.ts`
- `src/features/sub-window/ipc/spotlight-handlers.ts`
- `src/features/sub-window/ipc/tabgroup-handlers.ts`
- `src/features/sub-window/ipc/index.ts`
- `src/features/spotlight/overlay.register.ts`
- `src/features/vault/overlay.register.ts`
- `src/features/translate/overlay.register.ts`
- `src/features/userscript/overlay.register.ts`
- `src/features/tabGroup/overlay.register.ts`

### Modified files
- `src/core/controller/viewController.ts` — imports from `sub-window/ipc` instead of individual route-init files; removed `spotlightController` field
- `src/features/sub-window/main.tsx` — uses `SUB_WINDOW_EMIT` constants; re-registers `NAVIGATE`/`PAYLOAD` listeners
- `src/features/sub-window/pages/overlay-page.tsx` — uses `SUB_WINDOW_RENDERER_EVENT.CLOSE` constant
- `src/features/sub-window/service/index.ts` — uses IPC constants instead of hardcoded strings
- `src/shared/constants/ipc/sub-window.ts` — added `SUB_WINDOW_INVOKE.RESOLVE`, `SUB_WINDOW_RENDERER_EVENT.RESOLVE`
- `src/features/vault/overlay/App.tsx` — sessionStorage + SUB_WINDOW_RESOLVE pattern
- `src/features/translate/overlay/App.tsx` — sessionStorage + SUB_WINDOW_RESOLVE pattern
- `src/features/userscript/overlay/App.tsx` — sessionStorage + SUB_WINDOW_RESOLVE pattern
- `src/features/spotlight/overlay/App.tsx` — sessionStorage for open payload, no SPOTLIGHT_OPEN listener
- `src/features/spotlight/index.ts` — removed `export * from "./route-init"`
- `src/core/controller/tabGroup/tabGroupRoute.ts` — removed `TabGroupRoute` export, kept `tabGroupController`
- `src/features/tabGroup/controller/index.ts` — cleared (overlay barrel)
- `src/features/tabGroup/service/index.ts` — cleared (overlay barrel)

### Deleted files
- `src/features/vault/route-init.ts`
- `src/features/translate/route-init.ts`
- `src/features/userscript/route-init.ts`
- `src/features/spotlight/route-init.ts`
- `src/features/tabGroup/controller/TabGroupOverlayController.ts`
- `src/features/tabGroup/service/TabGroupOverlayService.ts`

### Phase 5 changes
- `src/features/spotlight/overlay/App.tsx` — removed Cmd+K keydown handler (eliminates double-fire race with ApplicationMenu accelerator)
- `src/features/sub-window/service/index.ts` — `close()` now destroys webContents, nullifies `this.view`/`this.readyPromise`; removed `openDevTools()` call
- `src/features/sub-window/assets/styles.css` — added `@source` directives for all 5 overlay directories
- `scripts/build-renderers.mjs` — replaced old renderer entries with `sub_window`
