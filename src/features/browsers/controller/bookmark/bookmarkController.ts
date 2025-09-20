import { StoreManager } from "../../stores";

export class Bookmark {
  bookmarks: Set<string> = new Set();
  private bookmarkStore: StoreManager = new StoreManager("bookmark");

  async initialize() {
    const bookmarkRaw = await this.bookmarkStore.readFiles<Record<string, string[]>>();
    this.bookmarks = new Set(bookmarkRaw?.bookmark);
  }

  saveBookmark() {
    this.bookmarkStore.saveFiles({ bookmark: Array.from(this.bookmarks) });
  }
}
