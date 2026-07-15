import { appDb } from "~/main/core/stores";

export async function handleStorage(
  scriptId: string,
  method: string,
  args: any[],
): Promise<any> {
  appDb.run(
    "CREATE TABLE IF NOT EXISTS gm_values (script_id TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY (script_id, key))",
  );

  switch (method) {
    case "GM_getValue":
    case "GM.getValue": {
      const [key, defaultValue] = args;
      const row = appDb.get<{ value: string }>("SELECT value FROM gm_values WHERE script_id = ? AND key = ?", [scriptId, key]);
      return row ? JSON.parse(row.value) : defaultValue;
    }

    case "GM_setValue":
    case "GM.setValue": {
      const [key, value] = args;
      appDb.run(
        "INSERT OR REPLACE INTO gm_values (script_id, key, value) VALUES (?, ?, ?)",
        [scriptId, key, JSON.stringify(value)],
      );
      return;
    }

    case "GM_deleteValue":
    case "GM.deleteValue": {
      const [key] = args;
      appDb.run("DELETE FROM gm_values WHERE script_id = ? AND key = ?", [scriptId, key]);
      return;
    }

    case "GM_listValues":
    case "GM.listValues": {
      const rows = appDb.query<{ key: string }>("SELECT key FROM gm_values WHERE script_id = ?", [scriptId]);
      return rows.map((r) => r.key);
    }

    default:
      throw new Error(`Unknown storage method: ${method}`);
  }
}
