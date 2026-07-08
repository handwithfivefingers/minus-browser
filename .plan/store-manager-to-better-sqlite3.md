# Migration Plan: StoreManager → better-sqlite3

## Goal

Replace the 9 JSON files managed by `StoreManager` (`src/core/stores/storeManager.ts`) with a single SQLite database using `better-sqlite3`, while keeping Electron version pinned to avoid native rebuild issues.

---

## Current Architecture

### StoreManager (`src/core/stores/storeManager.ts:39`)

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
| `session` | `session.json` | (being phased out per session doc) | — |

Plus a `CacheSystem` in-memory layer wraps most of these stores.

---

## Phase 0: Prerequisites

### 1. Pin Electron version

`package.json` — use exact version (no `^`):

```json
"electron": "42.2.0"
```

### 2. Install dependencies

```
npm install better-sqlite3
npm install --save-dev @types/better-sqlite3 @electron/rebuild
```

### 3. Add postinstall rebuild script

```json
"scripts": {
  "postinstall": "electron-rebuild -f -w better-sqlite3"
}
```

---

## Phase 1: Database Foundation

### New file: `src/core/stores/database.ts`

Singleton class owning the `better-sqlite3` connection:

```ts
import Database from "better-sqlite3";
import path from "node:path";

const baseDir = /* same dir resolution as StoreManager */;

class AppDatabase {
  private db: Database.Database;

  constructor() {
    this.db = new Database(path.join(baseDir, "minus-browser.db"));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.runMigrations();
  }

  query<T>(sql: string, params?: any[]): T[] { ... }
  get<T>(sql: string, params?: any[]): T | undefined { ... }
  run(sql: string, params?: any[]): void { ... }
  transaction<T>(fn: () => T): T { ... }
  close(): void { ... }
}

export const appDb = new AppDatabase();
```

### New file: `src/core/stores/migrations.ts`

Versioned schema migrations tracked in a `_migrations` table. Version 1 creates all initial tables.

---

## Phase 2: Schema Design

All tables live in `minus-browser.db`:

### `_migrations`
| Column | Type |
|---|---|
| version | INTEGER PK |
| applied_at | TEXT |

### `app_state`
| Column | Type | Notes |
|---|---|---|
| key | TEXT PK | e.g. `tab_index`, `active_tab_id` |
| value | TEXT | JSON-stringified value |

Replaces: index + activeTabId from `userData.json`

### `tabs`
| Column | Type |
|---|---|
| id | TEXT PK |
| title | TEXT |
| url | TEXT |
| is_pinned | INTEGER (0/1) |
| is_focused | INTEGER (0/1) |
| index | INTEGER |
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

Replaces: tabs array from `userData.json`

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

Replaces: tabGroups from `userData.json`

### `bookmarks`
| Column | Type |
|---|---|
| url | TEXT PK |
| created_at | INTEGER |

Replaces: `bookmark.json`

### `history_entries`
| Column | Type | Index |
|---|---|---|
| id | TEXT PK | |
| url | TEXT NOT NULL | ✅ |
| title | TEXT | |
| favicon | TEXT | |
| timestamp | INTEGER | ✅ |
| visit_count | INTEGER DEFAULT 1 | |

Replaces: `history.json`

### `permissions`
| Column | Type |
|---|---|
| origin | TEXT (PK) |
| permission | TEXT (PK) |
| decision | TEXT |

Replaces: `permission.json`

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

Replaces: `translate.json`

### `password_vault_items`
| Column | Type |
|---|---|
| id | TEXT PK |
| site | TEXT |
| username | TEXT |
| encrypted_password | TEXT (encrypted via `safeStorage`) |
| notes | TEXT |
| created_at | INTEGER |
| updated_at | INTEGER |

Replaces: `passwordVault.json`

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

Replaces: `userscripts.json`

---

## Phase 3: Integration (store by store)

### 3.1 `bookmark` — `src/core/controller/bookmark/bookmarkController.ts`
- [ ] Replace `StoreManager` with `appDb`
- [ ] `initialize()` → `appDb.query("SELECT url FROM bookmarks")`
- [ ] `saveBookmark()` → transactional DELETE + INSERT

### 3.2 `permission` — `src/core/stores/permission.store.ts`
- [ ] Replace `StoreManager` with `appDb`
- [ ] `getSitePermission()` → `appDb.get("SELECT decision FROM permissions WHERE ...")`
- [ ] `setSitePermission()` → `INSERT OR REPLACE`
- [ ] `resetSitePermission()` → `DELETE`
- [ ] `resetAllPermissions()` → `DELETE FROM permissions`

### 3.3 `translate` — `src/features/translate/services/index.ts`
- [ ] Replace `StoreManager` with `appDb`
- [ ] `initialize()` → read from both `translate_preferences` + `translate_recent_selections`
- [ ] `persist()` → transactional update of both tables

### 3.4 `userscript` — `src/features/userscript/controllers/index.ts`
- [ ] Replace `StoreManager` with `appDb`
- [ ] `load()` → `appDb.query("SELECT * FROM user_scripts")`
- [ ] `persist()` → transactional DELETE + INSERT

### 3.5 `interface` — `src/core/controller/viewController.ts`
- [ ] Replace `interfaceStore` with `appDb`
- [ ] `loadUserInterface()` → read from `user_interface` table → reconstruct object
- [ ] `interfaceSave(data)` → upsert all keys in a transaction
- [ ] Update `Tab` model's `this.interface.readFiles()` call (tab.ts:205) to use `appDb`

### 3.6 `passwordVault`
**`src/features/vault/controllers/passwordController.ts`** and **`src/features/password/controller/passwordController.ts`**
- [ ] Replace `StoreManager` with `appDb`
- [ ] `initialize()` → query `password_vault_items`, decrypt each `encrypted_password`
- [ ] `persist()` → transactional DELETE + INSERT, encrypt passwords via `safeStorage.encryptString()` before insert

### 3.7 `history` — `src/core/controller/history/historyController.ts`
- [ ] Replace `StoreManager` with `appDb`
- [ ] Drop the in-memory `entries` array — query DB directly
- [ ] `addEntry()` → `INSERT` or `UPDATE ... SET visit_count = visit_count + 1`
- [ ] `getAll()` → `SELECT * FROM history_entries ORDER BY timestamp DESC`
- [ ] `search(query)` → `SELECT ... WHERE title LIKE ? OR url LIKE ?`
- [ ] `deleteEntry()` → `DELETE WHERE id = ?`
- [ ] `clearAll()` → `DELETE FROM history_entries`
- [ ] `cleanOldEntries()` → `DELETE WHERE timestamp < ?`
- [ ] Remove debounce + save timer — each write is immediate (WAL)

### 3.8 `userData` — 3 consumers:

**`ViewController.persist()`** (viewController.ts:532):
- [ ] Write `tabs` table, `app_state` (index + activeTabId), `tab_groups` table — all in one transaction

**`TabController`** (tabs/controllers/index.ts):
- [ ] `initialize()`: read from `tabs` + `app_state` instead of `cacheSystem.get("tab")`
- [ ] `syncCache()`: write to `tabs` + `app_state` instead of `cacheSystem.set("tab")`

**`TabGroupController`** (tabGroup/controllers/index.ts):
- [ ] Replace `groupStore` with `appDb`
- [ ] `initialize()`: read from `tab_groups`
- [ ] `syncCache()`: transactional write to `tab_groups`
- [ ] All CRUD methods: direct SQL

---

## Phase 4: CacheSystem Update

**`src/features/cacheSystem/index.ts`**

Keep as read-only in-memory cache. Remove write-through — controllers write directly to DB:

- `get(key, fallback?)`: if cached → return, else → read from DB → cache
- `set(key, value)`: update in-memory cache only (controller handles DB writes)
- `delete(key)`: remove from cache

---

## Phase 5: Data Migration (on first startup)

In `database.ts` constructor, after `runMigrations()`:

```ts
function migrateFromJsonFiles() {
  const files = [
    "userData.json", "interface.json", "bookmark.json",
    "history.json", "userscripts.json", "passwordVault.json",
    "translate.json", "permission.json"
  ];
  for (const file of files) {
    const jsonPath = path.join(baseDir, file);
    if (!fs.existsSync(jsonPath)) continue;
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
    // insert into appropriate tables per file
    // on success: fs.renameSync(jsonPath, jsonPath + ".migrated")
  }
}
```

Each file migration is transactional. Password vault items must be decrypted with `safeStorage.decryptString()` then re-encrypted before insert.

---

## Phase 6: Cleanup

- [ ] Delete `src/core/stores/storeManager.ts`
- [ ] Update `src/core/stores/index.ts` — export `appDb` instead of `StoreManager`
- [ ] Remove JSON file references from codebase
- [ ] Verify all 13+ usage sites no longer import `StoreManager`

---

## Files to change

| File | Change |
|---|---|
| `package.json` | Pin electron, add deps, add postinstall script |
| `src/core/stores/database.ts` | **NEW** — DB connection + helpers |
| `src/core/stores/migrations.ts` | **NEW** — schema migrations |
| `src/core/stores/index.ts` | Export `appDb` |
| `src/core/stores/storeManager.ts` | **DELETE** |
| `src/core/stores/permission.store.ts` | Replace StoreManager |
| `src/core/controller/viewController.ts` | Replace `userStore`, `interfaceStore` |
| `src/core/controller/bookmark/bookmarkController.ts` | Replace StoreManager |
| `src/core/controller/history/historyController.ts` | Replace StoreManager, drop in-memory array |
| `src/features/tabs/controllers/index.ts` | Replace `userStore`, `interfaceStore` |
| `src/features/tabs/models/tab.ts` | Replace `interface` StoreManager |
| `src/features/tabGroup/controllers/index.ts` | Replace `groupStore` |
| `src/features/vault/controllers/passwordController.ts` | Replace StoreManager |
| `src/features/password/controller/passwordController.ts` | Replace StoreManager |
| `src/features/translate/services/index.ts` | Replace StoreManager |
| `src/features/userscript/controllers/index.ts` | Replace StoreManager |
| `src/features/cacheSystem/index.ts` | Remove write-through |

---

## Rollback Strategy

- Migrated `.json` files are renamed to `.json.migrated` (never deleted)
- To roll back: delete `minus-browser.db`, rename each `.json.migrated` → `.json`
- SQLite WAL files can be safely deleted if `minus-browser.db` is removed
