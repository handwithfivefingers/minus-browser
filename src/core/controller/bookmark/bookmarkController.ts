import { StoreManager } from "~/core/stores";

export class Bookmark {
  bookmarks: Set<string> = new Set();
  private bookmarkStore: StoreManager = new StoreManager("bookmark");

  async initialize() {
    try {
      const bookmarkRaw =
        await this.bookmarkStore.readFiles<Record<string, string[]>>();
      this.bookmarks = new Set(bookmarkRaw?.bookmark || []);
    } catch (error) {
      this.bookmarks = new Set();
    }
  }

  saveBookmark() {
    this.bookmarkStore.saveFiles({ bookmark: Array.from(this.bookmarks) });
  }
}
