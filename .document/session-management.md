# Session Management Migration Plan

## Current Architecture

`SimpleSessionManager` wraps `session.fromPartition("persist:minus-browser", { cache: true })` and manually serializes/deserializes all cookies to a JSON file (`session.json`). It is used by all `WebContentsView` instances (tabs, vault, userscript, translate, spotlight).

```
SimpleSessionManager
  ├── save()     → writes ALL cookies to session.json
  ├── load()     → reads ALL cookies from session.json → cookies.set() each
  ├── watch()    → cookies.on("changed") → debounce(500ms) → save()
  └── session    → Electron.Session from partition "persist:minus-browser"
```

## Problems

### 1. Cookie Mismatch from 3rd-Party Sites (Data Loss)
Manual serialization/deserialization loses or corrupts cookie attributes:

| Bug | Code Location | Impact |
|---|---|---|
| `url` reconstruction `http\${secure ? "s" : ""}://\${domain.replace(/^\./, "")}` breaks on `localhost`, IPs, ports without domain | `index.ts:48-49` | Cookie silently fails to restore |
| `sameSite` defaulted to `"no_restriction"` | `index.ts:57` | Breaks CSRF; cookies sent cross-site incorrectly |
| Missing fields: `priority`, `sameParty`, `partitionKey`, `sourceScheme`, `sourcePort` | `index.ts:48-58` | Cookie rejected on set or behaves differently |
| Host-only cookies (no domain) are skipped entirely | `index.ts:46` | Session cookies for `localhost` lost |
| `expirationDate` may elapse between save and load | `index.ts:56` | Expired cookies attempted on restore |
| Partitioned cookies (CHIPS) lose their `partitionKey` | `index.ts:48-58` | Partitioned cookies become global |

### 2. Missing Cookies on Version Upgrade
- `session.json` is separate from Electron's native SQLite cookie store in `Partitions/`
- If one is updated but not the other, they drift
- No Electron version compatibility check — loading an old DB into a new Electron may cause silent corruption

### 3. Performance
- On every single cookie change → full dump of ALL cookies via `cookies.get({})` → full JSON write
- 500ms debounce prevents rapid-fire saves but doesn't avoid the full dump cost
- `cacheSystem.set("session", cookies)` is redundant with the file write
- Race condition: `load()` and `watch()` are called from different async paths

### 4. Redundancy
- `persist:minus-browser` is already a persistent partition — Electron natively stores cookies in SQLite
- `migrator.ts` already copies the `Partitions/` directory on version upgrade
- The manual JSON file duplicates what Electron already manages

## Migration Plan

### Phase 1: Eliminate Manual Cookie Serialization

Remove `save()`, `load()`, `watch()`, and `parseCookies()` from `SimpleSessionManager`. Rely entirely on Electron's native partition persistence.

**Why this works:**
- `session.fromPartition("persist:minus-browser", { cache: true })` persists cookies, localStorage, IndexedDB, Service Workers, and cache to `Partitions/persist:minus-browser/` (SQLite, WAL mode)
- All 6 `WebContentsView` instances share the same partition — cookies are shared natively
- Tab hibernate (`destroyView()`) / wake (`createView()`) preserves session because the partition is persistent
- Electron's network stack handles: `SameSite`, `Secure`, `HttpOnly`, `Partitioned` (CHIPS), `Priority`, `SourceScheme`, and all modern cookie attributes correctly

**New module shape:**
```ts
import { session, app } from "electron";
import { migrateUserData } from "./migrator";

export const MINUS_BROWSER_PARTITION = "persist:minus-browser";

let browserSession: Electron.Session;
const sessionInitPromise = app.whenReady().then(async () => {
  await migrateUserData();
  browserSession = session.fromPartition(MINUS_BROWSER_PARTITION, { cache: true });
});

export { browserSession, sessionInitPromise };
```

**Files to change:**
| File | Change |
|---|---|
| `src/core/services/session/index.ts` | Strip `save/load/watch/parseCookies`; simplify to partition creation + export |
| `src/main.ts` | Remove `minusSessionManager.load()` and `minusSessionManager.watch()` |
| `src/features/system/controller/viewController.ts:106-108` | Remove `minusSessionManager.load()` and `minusSessionManager.watch()` |
| `src/features/system/controller/viewController.ts:417` | Remove `minusSessionManager.save()` (keep `cookies.flushStore()` + `flushStorageData()`) |

### Phase 2: Reliable Migration on Version Upgrade

**Problem**: App version upgrades (v0.3.1 → v0.3.2) can cause cookie mismatch because Chromium's bundled cookie validation rules get stricter between versions. Cookies already in the SQLite DB bypass validation on read — they're served as-is but the browser may silently refuse to send them, causing authentication failures.

**Solution**: On every startup, compare stored versions (`.app-info`) against current versions. If a change is detected, run a compatibility fix:

| Change | Detail |
|---|---|
| Remove `session.json` from `STORE_FILES` in `migrator.ts` | No longer used |
| Add Electron version guard to `migrator.ts` | Skip copying `Partitions/` if Electron major version changed (avoid loading incompatible DB schema) |
| Unified `.app-info` sentinel | Stores both `appVersion` and `electronVersion`. Written every startup after all migrations complete. |
| **App version change** (v0.3.1 → v0.3.2) | Export all cookies via `cookies.get({})` → `clearStorageData({ storages: ["cookies"] })` → re-import each cookie via `cookies.set()`. New Chromium validation naturally drops incompatible cookies, valid ones are preserved. |
| **Electron major change** (28→29) | `session.clearStorageData()` — full storage wipe (DB schema may be incompatible) |
| Backward-compat one-time migration | On first launch after update: if `Partitions/persist:minus-browser/Cookies` doesn't exist but old `session.json` does, read it, call `cookies.set()` for each cookie, then delete `session.json` |

### Phase 3: Session Partition Strategy for Sub-Views

Separate feature views from the main browsing session:

| Component | Partition | Rationale |
|---|---|---|
| Tab content | `persist:minus-browser` (existing) | Full browsing session |
| Vault | `persist:minus-vault` | May need auth persistence, separate from browsing |
| UserScript | `in-memory` (no persist) | Only loads local files |
| Translate | `in-memory` (no persist) | Only API calls |
| Spotlight | `in-memory` (no persist) | Only API calls |
| Findbar | `persist:minus-browser` (or default) | Searches within page context |

Benefits: no cross-contamination of cookies, reduced disk I/O for disposable views.

### Phase 4: Graceful Cookie Change Handling

Forwards cookie changes to the renderer via `COOKIE_CHANGED` IPC event. No debounce, no file I/O.

```ts
function forwardCookieChanges() {
  browserSession.cookies.on("changed", (_event, cookie, cause, removed) => {
    if (cause === "explicit" || cause === "overwrite") {
      const win = BrowserWindow.getAllWindows()[0];
      win?.webContents.send("COOKIE_CHANGED", { cookie, removed });
    }
  });
}
```

Filtered to `explicit` and `overwrite` causes only (skips `expired` floods). Added `COOKIE_CHANGED` to `IPC_RENDERER_EVENT` in `src/shared/constants/ipc.ts`.

### Phase 5: Performance Gains

| Before | After |
|---|---|
| O(n) full cookie dump on every change | Zero serialization cost (native SQLite) |
| `debounce(500ms)` → burst of full writes | `flushStore()` only on quit |
| `cacheSystem.set("session", cookies)` | Dead code removed |
| Race between `load()` in main.ts vs viewController.ts | Single init path via `sessionInitPromise` |

### Phase 6: UX Improvements

| Scenario | Current Behavior | Improved Behavior |
|---|---|---|
| Tab hibernate/wake | `loadURL(url)` → full reload, no referrer, scroll lost | Saves `document.referrer` + scroll position (`window.scrollX/Y`) on hibernate; passes `httpReferrer` to `loadURL()` on wake; restores scroll position via `window.scrollTo()` after `did-finish-load` |
| App crash | Last debounced save may not have fired, losing recent cookies | SQLite WAL mode is crash-resistant (achieved in Phase 1) |
| Cookie export/import | Implicit on every change | Add explicit IPC handlers only when user requests (if needed) |
| Navigation after wake | `wake()` loads saved URL → caller loads target URL (double load) | `wake(url?)` accepts optional URL parameter; `handleURLChange` passes target URL directly, avoiding redundant load |

## Current State (After All Phases)

All 6 phases are implemented. The session system now relies entirely on Electron's native partition persistence with zero manual cookie serialization.

### Startup Initialization Order (`session/index.ts`)

```
app.whenReady()
  ├── migrateUserData()          — one-time: copy stores from old userData paths
  ├── createSession()            — session.fromPartition("persist:minus-browser", { cache: true })
  ├── migrateLegacyCookies()     — one-time: restore cookies from old session.json if native DB missing
  ├── handleVersionChange()
  │     ├── Electron major changed  → clearStorageData() (full wipe)
  │     └── App version changed     → refreshCookies() (export → clear → re-import through new validation)
  ├── writeVersionInfo()         — save current appVersion + electronVersion to .app-info
  └── forwardCookieChanges()     — forward cookie changed events to renderer via COOKIE_CHANGED IPC
```

### File Map

| File | Role |
|---|---|
| `src/core/services/session/index.ts` | Session creation, version upgrade handling, cookie change forwarding |
| `src/core/services/session/migrator.ts` | userData migration, `.app-info` version tracking, legacy session.json restore |
| `src/features/tabs/models/tab.ts` | Tab hibernate/wake with referrer + scroll preservation |
| `src/features/system/controller/viewController.ts` | Removed manual cookie save/load/watch; passes URL to `wake()` to avoid double-load |
| `src/shared/constants/ipc.ts` | Added `COOKIE_CHANGED` renderer event |

### Partition Assignment

| Component | Partition | Type |
|---|---|---|
| Tab content | `persist:minus-browser` | Persistent |
| Vault | `persist:minus-vault` | Persistent, isolated |
| UserScript | `minus-userscript` | In-memory |
| Translate | `minus-translate` | In-memory |
| Spotlight | `minus-spotlight` | In-memory |
| Findbar | (default Electron session) | Persistent |

### Version Upgrade Handling

| Scenario | Detection | Action |
|---|---|---|
| App upgrade (v0.3.1 → v0.3.2) | `.app-info` appVersion differs | Export → clear → re-import cookies (new Chromium validation drops invalid) |
| Electron major upgrade (28→29) | `.app-info` electronVersion major differs | `clearStorageData()` — full wipe (DB schema may break) |
| Fresh install | No `.app-info` | No action |
| Same version restart | Versions match | No action |
