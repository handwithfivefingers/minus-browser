# Cookie & userData Migration on Version Upgrade

## Problem

When the app upgrades, cookies (especially third-party cookies from Google, etc.) are lost because the `userData` path can change between versions (e.g., app name case change, bundle ID change, dev vs production). This causes:

- All cookies disappear after upgrade
- Google and other sites that use cross-domain cookies show "Cookie mismatch" errors
- User must re-login everywhere

## Root Cause

Electron's `session.fromPartition("persist:minus-browser", { cache: true })` stores cookies in a SQLite DB at `{userData}/Partitions/minus-browser/Cookies`. If `userData` path changes:

- The new path has a fresh empty SQLite DB
- The old cookie data is orphaned at the old path
- The custom `session.json` backup is also at the old path

Additionally, `EnableCookieEncryption` in `forge.config.ts` means the SQLite DB is encrypted with a keychain entry tied to the app identity. If the identity changes, the old DB becomes unreadable, making the custom JSON backup the only recovery mechanism.

## Solution: `migrateUserData()`

A new migration module at `src/main/core/services/session/migrator.ts` that runs before the session is initialized:

### Flow

```
app.whenReady()
  ↓
migrateUserData()
  ├── Check for sentinel file (.migrated) → skip if exists
  ├── Scan known old userData paths
  │     ├── ~/Library/Application Support/minusbrowser/
  │     ├── ~/Library/Application Support/MinusBrowser/
  │     ├── ~/Library/Application Support/com.minusbrowser.localdev/
  │     └── ~/Library/Application Support/Electron/
  ├── For each old path found:
  │     ├── Copy all JSON store files (session.json, userData.json, etc.)
  │     └── Copy entire Partitions/ directory (SQLite cookie DB)
  └── Write .migrated sentinel file
  ↓
new SimpleSessionManager()  ← finds migrated data
  ↓
session.fromPartition()     ← opens migrated SQLite DB
  ↓
load()                      ← reads migrated session.json
```

### What Gets Migrated

| File/Directory | Source | Destination | Purpose |
|----------------|--------|-------------|---------|
| `session.json` | Old userData | New userData | Cookie backup with preserved attributes |
| `userData.json` | Old userData | New userData | Tab state, active tab |
| `interface.json` | Old userData | New userData | UI preferences |
| `bookmark.json` | Old userData | New userData | Bookmarks |
| `history.json` | Old userData | New userData | Browsing history |
| `userscripts.json` | Old userData | New userData | User scripts |
| `passwordVault.json` | Old userData | New userData | Saved passwords |
| `translate.json` | Old userData | New userData | Translation settings |
| `Partitions/` | Old userData | New userData | Electron's native cookie SQLite DB |

### Sentinel File

Written to `{newUserData}/.migrated` after first migration. Contains:

```json
{
  "version": "0.3.1.2",
  "migratedAt": "2026-06-18T...",
  "migratedFrom": ["/path/to/old/userData"]
}
```

This ensures migration runs only once per userData path. If the path changes again in a future version, migration re-runs against the new path.

## Race Condition Fix: Async Initialization Ordering

The migration is async (`await migrateUserData()`), so the module-level `app.whenReady().then()` callback is now also async. This created a subtle race:

- `session/index.ts` registers handler A (migrate → create manager)
- `main.ts` registers handler B (createWindow → use manager)
- Both `.then()` handlers on `app.whenReady()` run in registration order, but **async handlers don't wait for each other**
- Handler A starts migration, hits `await`, suspends
- Handler B starts immediately after, calls `minusSessionManager.load()` → **crash** because manager is still `undefined`

**Fix**: Export `sessionInitPromise` from `session/index.ts` and `await` it in `main.ts` before calling `createWindow()`:

```ts
// session/index.ts
const sessionInitPromise = app.whenReady().then(async () => {
  await migrateUserData();
  minusSessionManager = new SimpleSessionManager(MINUS_BROWSER_PARTITION);
});
export { minusSessionManager, sessionInitPromise };

// main.ts — in app.whenReady handler:
await sessionInitPromise;   // wait for migration + manager creation
await this.createWindow();  // now minusSessionManager is defined
```

This chains the two handlers: `main.ts` explicitly waits for `session/index.ts`'s initialization to complete via the shared promise reference.

## Files Changed

| File | Change |
|------|--------|
| `src/main/core/services/session/migrator.ts` | **New** — migration logic |
| `src/main/core/services/session/index.ts` | Import `migrateUserData` + `sessionInitPromise` export; call migration before `SimpleSessionManager` construction |
| `src/main/index.ts` | Import `sessionInitPromise`; `await sessionInitPromise` before `createWindow()` |
| `.document/cookie-migration/README.md` | This file |

## Related Fixes

Alongside migration, the cookie handling was also fixed:

1. **`src/main/core/services/session/index.ts:56`** — `sameSite: "no_restriction"` → `cookie.sameSite || "no_restriction"`. Preserves the original SameSite attribute per-cookie instead of forcing all to `SameSite=None`, which was breaking Google's signed cookie validation.

## Caveats

- **First run after upgrade**: Migration is a one-shot operation. It copies (not moves) data — old data remains at the old path as a backup.
- **Dev mode**: In development, JSON stores live in `./appData/` (project directory) while the partition SQLite DB lives in `~/Library/Application Support/Electron/`. Migration handles both locations independently.
- **Migration is additive**: If multiple old userData paths exist, data is copied from all of them (last path wins on conflicts).
