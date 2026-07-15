import { DatabaseSync } from "node:sqlite";

const migrations: { version: number; up: (db: DatabaseSync) => void }[] = [
  {
    version: 1,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS _migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS tabs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL DEFAULT '',
          url TEXT NOT NULL DEFAULT '',
          is_pinned INTEGER NOT NULL DEFAULT 0,
          is_focused INTEGER NOT NULL DEFAULT 0,
          "index" INTEGER NOT NULL DEFAULT 0,
          favicon TEXT NOT NULL DEFAULT '',
          timestamp INTEGER NOT NULL DEFAULT 0,
          is_bookmarked INTEGER NOT NULL DEFAULT 0,
          is_hibernated INTEGER NOT NULL DEFAULT 0,
          prevent_hibernate INTEGER NOT NULL DEFAULT 0,
          group_id TEXT,
          audible INTEGER NOT NULL DEFAULT 0,
          is_muted INTEGER NOT NULL DEFAULT 0,
          is_using_camera INTEGER NOT NULL DEFAULT 0,
          is_using_microphone INTEGER NOT NULL DEFAULT 0,
          is_using_screen_share INTEGER NOT NULL DEFAULT 0,
          blocked_notifications TEXT,
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS tab_groups (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          color TEXT NOT NULL DEFAULT '#6366f1',
          hidden INTEGER NOT NULL DEFAULT 0,
          collapsed INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0,
          tab_ids TEXT NOT NULL DEFAULT '[]'
        );

        CREATE TABLE IF NOT EXISTS bookmarks (
          url TEXT PRIMARY KEY,
          created_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS history_entries (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL,
          title TEXT NOT NULL DEFAULT '',
          favicon TEXT NOT NULL DEFAULT '',
          timestamp INTEGER NOT NULL DEFAULT 0,
          visit_count INTEGER NOT NULL DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_history_url ON history_entries(url);
        CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history_entries(timestamp);

        CREATE TABLE IF NOT EXISTS permissions (
          origin TEXT NOT NULL,
          permission TEXT NOT NULL,
          decision TEXT NOT NULL DEFAULT 'prompt',
          PRIMARY KEY (origin, permission)
        );

        CREATE TABLE IF NOT EXISTS translate_preferences (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS translate_recent_selections (
          id TEXT PRIMARY KEY,
          tab_id TEXT NOT NULL DEFAULT '',
          source_text TEXT NOT NULL DEFAULT '',
          translated_text TEXT NOT NULL DEFAULT '',
          source_language TEXT NOT NULL DEFAULT '',
          target_language TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS password_vault_items (
          id TEXT PRIMARY KEY,
          site TEXT NOT NULL DEFAULT '',
          username TEXT NOT NULL DEFAULT '',
          encrypted_password TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS user_scripts (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT '',
          source TEXT NOT NULL DEFAULT '',
          enabled INTEGER NOT NULL DEFAULT 0,
          matches TEXT NOT NULL DEFAULT '[]',
          excludes TEXT NOT NULL DEFAULT '[]',
          run_at TEXT NOT NULL DEFAULT 'document-start',
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );
      `);
    },
  },
  {
    version: 2,
    up: (db) => {
      const columns = db.prepare("PRAGMA table_info(tab_groups)").all() as { name: string }[];
      if (!columns.some((c) => c.name === "tab_ids")) {
        db.exec(`ALTER TABLE tab_groups ADD COLUMN tab_ids TEXT NOT NULL DEFAULT '[]'`);
      }
    },
  },
  {
    version: 3,
    up: (db) => {
      const columns = db.prepare("PRAGMA table_info(tab_groups)").all() as { name: string }[];
      if (!columns.some((c) => c.name === "tab_ids")) {
        db.exec(`ALTER TABLE tab_groups ADD COLUMN tab_ids TEXT NOT NULL DEFAULT '[]'`);
      }
    },
  },
  {
    version: 4,
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS todo_items (
          id TEXT PRIMARY KEY,
          label TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          checked INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT 0,
          updated_at INTEGER NOT NULL DEFAULT 0
        );
      `);
    },
  },
  {
    version: 5,
    up: (db) => {
      const columns = db.prepare("PRAGMA table_info(user_scripts)").all() as { name: string }[];
      const has = (name: string) => columns.some((c) => c.name === name);
      if (!has("namespace")) db.exec(`ALTER TABLE user_scripts ADD COLUMN namespace TEXT NOT NULL DEFAULT ''`);
      if (!has("version")) db.exec(`ALTER TABLE user_scripts ADD COLUMN version TEXT NOT NULL DEFAULT ''`);
      if (!has("description")) db.exec(`ALTER TABLE user_scripts ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
      if (!has("author")) db.exec(`ALTER TABLE user_scripts ADD COLUMN author TEXT NOT NULL DEFAULT ''`);
      if (!has("grants")) db.exec(`ALTER TABLE user_scripts ADD COLUMN grants TEXT NOT NULL DEFAULT '[]'`);
      if (!has("includes")) db.exec(`ALTER TABLE user_scripts ADD COLUMN includes TEXT NOT NULL DEFAULT '[]'`);
      if (!has("noframes")) db.exec(`ALTER TABLE user_scripts ADD COLUMN noframes INTEGER NOT NULL DEFAULT 0`);
      if (!has("icon")) db.exec(`ALTER TABLE user_scripts ADD COLUMN icon TEXT NOT NULL DEFAULT ''`);
      if (!has("download_url")) db.exec(`ALTER TABLE user_scripts ADD COLUMN download_url TEXT NOT NULL DEFAULT ''`);
      if (!has("update_url")) db.exec(`ALTER TABLE user_scripts ADD COLUMN update_url TEXT NOT NULL DEFAULT ''`);
      if (!has("support_url")) db.exec(`ALTER TABLE user_scripts ADD COLUMN support_url TEXT NOT NULL DEFAULT ''`);
      if (!has("homepage_url")) db.exec(`ALTER TABLE user_scripts ADD COLUMN homepage_url TEXT NOT NULL DEFAULT ''`);
      if (!has("license")) db.exec(`ALTER TABLE user_scripts ADD COLUMN license TEXT NOT NULL DEFAULT ''`);
      if (!has("connect")) db.exec(`ALTER TABLE user_scripts ADD COLUMN connect TEXT NOT NULL DEFAULT '[]'`);
      if (!has("requires")) db.exec(`ALTER TABLE user_scripts ADD COLUMN requires TEXT NOT NULL DEFAULT '[]'`);
      if (!has("resources")) db.exec(`ALTER TABLE user_scripts ADD COLUMN resources TEXT NOT NULL DEFAULT '[]'`);
      if (!has("built_in")) db.exec(`ALTER TABLE user_scripts ADD COLUMN built_in INTEGER NOT NULL DEFAULT 0`);
      if (!has("raw_metadata")) db.exec(`ALTER TABLE user_scripts ADD COLUMN raw_metadata TEXT NOT NULL DEFAULT ''`);
    },
  },
];

export function runMigrations(db: DatabaseSync) {
  const currentVersion = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'").get()
    ? (db.prepare("SELECT COALESCE(MAX(version), 0) as version FROM _migrations").get() as { version: number })?.version || 0
    : 0;

  for (const m of migrations) {
    if (m.version > currentVersion) {
      m.up(db);
      db.prepare("INSERT INTO _migrations (version) VALUES (?)").run(m.version);
    }
  }
}
