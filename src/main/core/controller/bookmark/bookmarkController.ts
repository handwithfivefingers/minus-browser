import { appDb } from "~/main/core/stores";

export class Bookmark {
  bookmarks: Set<string> = new Set();

  async initialize() {
    try {
      const rows = appDb.query<{ url: string }>("SELECT url FROM bookmarks");
      this.bookmarks = new Set(rows.map((r) => r.url));
    } catch (error) {
      this.bookmarks = new Set();
    }
  }

  saveBookmark() {
    appDb.transaction(() => {
      appDb.run("DELETE FROM bookmarks");
      const now = Date.now();
      for (const url of this.bookmarks) {
        appDb.run("INSERT INTO bookmarks (url, created_at) VALUES (?, ?)", [url, now]);
      }
    });
  }
}
