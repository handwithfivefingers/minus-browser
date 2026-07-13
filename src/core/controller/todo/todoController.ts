import { appDb } from "~/core/stores";
import { v7 as uuid_v7 } from "uuid";

export interface ITodoItem {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  created_at: number;
  updated_at: number;
}

export class TodoController {
  getAll(): ITodoItem[] {
    return appDb.query<ITodoItem>(
      "SELECT id, label, description, checked, created_at, updated_at FROM todo_items ORDER BY created_at DESC",
    );
  }

  create(label: string, description: string): ITodoItem {
    const now = Date.now();
    const item: ITodoItem = {
      id: uuid_v7(),
      label,
      description,
      checked: false,
      created_at: now,
      updated_at: now,
    };
    appDb.run(
      "INSERT INTO todo_items (id, label, description, checked, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      [item.id, item.label, item.description, item.checked ? 1 : 0, item.created_at, item.updated_at],
    );
    return item;
  }

  update(id: string, data: { label?: string; description?: string; checked?: boolean }): ITodoItem | null {
    const existing = appDb.get<ITodoItem>(
      "SELECT id, label, description, checked, created_at, updated_at FROM todo_items WHERE id = ?",
      [id],
    );
    if (!existing) return null;

    const updated = {
      ...existing,
      label: data.label ?? existing.label,
      description: data.description ?? existing.description,
      checked: data.checked ?? existing.checked,
      updated_at: Date.now(),
    };
    appDb.run(
      "UPDATE todo_items SET label = ?, description = ?, checked = ?, updated_at = ? WHERE id = ?",
      [updated.label, updated.description, updated.checked ? 1 : 0, updated.updated_at, id],
    );
    return updated;
  }

  delete(id: string): void {
    appDb.run("DELETE FROM todo_items WHERE id = ?", [id]);
  }
}
