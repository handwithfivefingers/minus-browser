# Migration: StoreManager → node:sqlite

## Goal

Replace the 9 JSON files managed by `StoreManager` (`src/core/stores/storeManager.ts`) with a single SQLite database using `node:sqlite` (built into Node 22+), avoiding native compilation (no node-gyp).

## Current Architecture

### StoreManager (deleted — was `src/core/stores/storeManager.ts`)

| Store Name | JSON File | Used By | Data Shape |
|---|---|---|---|
| `bookmark` | `bookmark.json` | `Bookmark` | `{ bookmark: string[] }` |
| `history` | `history.json` | `History` | `IHistoryEntry[]` |
| `userData` | `userData.json` | `ViewController`, `TabController`, `TabGroupController` | Mixed: tabs + index + activeTabId + tabGroups |
| `interface` | `interface.json` | `ViewController`, `Tab` | `IUserInterface` |
| `permission` | `permission.json` | `PermissionStore` | `Record<string, SitePermissions>` |
| `passwordVault` | `passwordVault.json` | `PasswordController` (vault + legacy) | Encrypted `IPasswordVaultPayload` |
| `translate` | `translate.json` | `TranslateService` | `{ preference, recentSelections }` |
| `userscripts` | `userscripts.json` | `UserScriptController` | `{ scripts: IUserScript[] }` |
| `session` | `session.json` | (phased out) | — |

Plus a `CacheSystem` in-memory layer wraps most of these stores (now read-only).

---

## Changes

### package.json

```json
{
  "electron": "42.2.0",
  "devDependencies": {
    // Removed: @electron/rebuild, @types/better-sqlite3
  },
  "dependencies": {
    // Removed: better-sqlite3
    // node:sqlite is built-in — no install needed
  }
}
```

No `postinstall` script required — no native modules to rebuild.

### New file: `src/core/stores/database.ts`

Singleton `AppDatabase` class wrapping `DatabaseSync` from `node:sqlite`:

```ts
import { DatabaseSync } from "node:sqlite";

class AppDatabase {
  private db: DatabaseSync;

  constructor() {
    this.db = new DatabaseSync("minus-browser.db");
    this.db.exec("PRAGMA journal_mode = WAL");
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec("PRAGMA busy_timeout = 5000");
    runMigrations(this.db);
    migrateFromJsonFiles();  // one-time JSON → SQLite
  }

  query<T>(sql, params?): T[]     // db.prepare(sql).all(...)
  get<T>(sql, params?): T | undefined  // db.prepare(sql).get(...)
  run(sql, params?): void         // db.prepare(sql).run(...)
  transaction<T>(fn): T           // manual BEGIN/COMMIT/ROLLBACK via exec()
  close(): void
}
```

### New file: `src/core/stores/migrations.ts`

Versioned schema migrations in a `_migrations` table. Version 1 creates all initial tables.

### Key design decisions

- Single `minus-browser.db` with WAL mode
- The `index` column in `tabs` is a SQLite reserved word → quoted as `"index"` everywhere
- `transaction()` uses manual `BEGIN`/`COMMIT`/`ROLLBACK` via `exec()` (DatabaseSync has no built-in `transaction()`)
- Passwords encrypted per-item with `safeStorage.encryptString()` → `encrypted_password` column
- JSON files renamed to `.json.migrated` after import (safe rollback)
- **No sentinel file** — `migrateFromJsonFiles()` runs every startup; already-migrated files are `.json.migrated` so they're skipped. This fixes a timing gap where `session/migrator.ts` copies legacy files into `userData` *after* the SQLite migration already ran.
- **Empty JSON files** (e.g. empty `bookmark.json`) are skipped before `JSON.parse` to avoid `Unexpected end of JSON input`.
- **Password vault decryption** is wrapped in try/catch — if `safeStorage` is unavailable or the keychain key has changed, the vault is skipped gracefully instead of falling through to `cipher.toString("utf-8")` (binary garbage) and crashing on `JSON.parse`.
- **Dead code removed**: `dataSync.intervalTime` / `dataSync.hardwareAcceleration` / `setDataSyncTime` were leftovers from the old JSON sync interval pattern — no timer ever consumed them.
- `session/migrator.ts` `STORE_FILES` now includes `permission.json` (was missing).

---

## Schema

All tables live in `minus-browser.db`:

### `_migrations`
| Column | Type |
|---|---|
| version | INTEGER PK |
| applied_at | TEXT |

### `app_state`
| Column | Type |
|---|---|
| key | TEXT PK |
| value | TEXT (JSON) |

Stores: `tab_index`, `active_tab_id`, `ui_*` keys (interface settings).

### `tabs`
Column `"index"` is double-quoted (SQLite reserved word).

| Column | Type |
|---|---|
| id | TEXT PK |
| title | TEXT |
| url | TEXT |
| is_pinned | INTEGER (0/1) |
| is_focused | INTEGER (0/1) |
| "index" | INTEGER |
| favicon | TEXT |
| timestamp | INTEGER |
| is_bookmarked | INTEGER (0/1) |
| is_hibernated | INTEGER (0/1) |
| prevent_hibernate | INTEGER (0/1) |
| group_id | TEXT |
| audible | INTEGER (0/1) |
| is_muted | INTEGER (0/1) |
| is_using_camera | INTEGER (0/1) |
| is_using_microphone | INTEGER (0/1) |
| is_using_screen_share | INTEGER (0/1) |
| blocked_notifications | TEXT (JSON) |
| error | TEXT (JSON) |

### `tab_groups`
| Column | Type |
|---|---|
| id | TEXT PK |
| name | TEXT |
| color | TEXT |
| hidden | INTEGER (0/1) |
| collapsed | INTEGER (0/1) |
| created_at | INTEGER |
| updated_at | INTEGER |

### `bookmarks`
| Column | Type |
|---|---|
| url | TEXT PK |
| created_at | INTEGER |

### `history_entries`
| Column | Type | Index |
|---|---|---|
| id | TEXT PK | |
| url | TEXT NOT NULL | ✅ |
| title | TEXT | |
| favicon | TEXT | |
| timestamp | INTEGER | ✅ |
| visit_count | INTEGER DEFAULT 1 | |

### `permissions`
| Column | Type |
|---|---|
| origin | TEXT PK |
| permission | TEXT PK |
| decision | TEXT |

### `translate_preferences`
| Column | Type |
|---|---|
| key | TEXT PK |
| value | TEXT |

### `translate_recent_selections`
| Column | Type |
|---|---|
| id | TEXT PK |
| tab_id | TEXT |
| source_text | TEXT |
| translated_text | TEXT |
| source_language | TEXT |
| target_language | TEXT |
| created_at | INTEGER |

### `password_vault_items`
| Column | Type |
|---|---|
| id | TEXT PK |
| site | TEXT |
| username | TEXT |
| encrypted_password | TEXT (safeStorage) |
| notes | TEXT |
| created_at | INTEGER |
| updated_at | INTEGER |

### `user_scripts`
| Column | Type |
|---|---|
| id | TEXT PK |
| name | TEXT |
| source | TEXT |
| enabled | INTEGER (0/1) |
| matches | TEXT (JSON array) |
| excludes | TEXT (JSON array) |
| run_at | TEXT |
| created_at | INTEGER |
| updated_at | INTEGER |

---

## Migrated consumers

| File | What changed |
|---|---|
| `src/core/stores/index.ts` | Export `appDb`, removed `StoreManager` re-export |
| `src/core/stores/storeManager.ts` | **Deleted** |
| `src/core/stores/permission.store.ts` | StoreManager → `appDb` queries |
| `src/core/controller/bookmark/bookmarkController.ts` | StoreManager → `appDb` |
| `src/core/controller/history/historyController.ts` | Removed in-memory array + debounce; direct SQL |
| `src/core/controller/viewController.ts` | `userStore`/`interfaceStore` → `appDb` |
| `src/features/tabs/controllers/index.ts` | Tab persistence via `appDb` |
| `src/features/tabs/models/tab.ts` | Removed `StoreManager("interface")` |
| `src/features/tabGroup/controllers/index.ts` | Groups via `appDb` |
| `src/features/vault/controllers/passwordController.ts` | StoreManager → `appDb` |
| `src/features/password/controller/passwordController.ts` | StoreManager → `appDb` |
| `src/features/translate/services/index.ts` | StoreManager → `appDb` |
| `src/features/userscript/controllers/index.ts` | StoreManager → `appDb` |
| `src/features/cacheSystem/index.ts` | Read-only cache (fixed `typeof` bug) |

---

## Rollback

- Migrated `.json` files are renamed to `.json.migrated` (never deleted)
- Rollback: delete `minus-browser.db`, rename each `.json.migrated` → `.json`
