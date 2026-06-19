import { StoreManager } from "~/core/stores";
import { v7 as uuid_v7 } from "uuid";
import { IHistoryEntry } from "./types";

const DEBOUNCE_MS = 500;
const CLEANUP_INTERVAL_MS = 3600000;
const DEFAULT_RETENTION_DAYS = 30;

export class History {
  private store: StoreManager = new StoreManager("history");
  private entries: IHistoryEntry[] = [];
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;
  retentionDays: number = DEFAULT_RETENTION_DAYS;

  async initialize() {
    try {
      this.entries = await this.store.readFiles<IHistoryEntry[]>();
      if (!Array.isArray(this.entries)) {
        this.entries = [];
      }
    } catch {
      this.entries = [];
    }
    this.cleanOldEntries();
    this.startCleanupTimer();
  }

  setRetentionDays(days: number) {
    this.retentionDays = days > 0 ? days : DEFAULT_RETENTION_DAYS;
  }

  cleanOldEntries() {
    const cutoff = Date.now() - this.retentionDays * 86400000;
    const before = this.entries.length;
    this.entries = this.entries.filter((e) => e.timestamp >= cutoff);
    if (this.entries.length !== before) {
      this.save();
    }
  }

  private startCleanupTimer() {
    this.stopCleanupTimer();
    this.cleanupTimer = setInterval(() => this.cleanOldEntries(), CLEANUP_INTERVAL_MS);
  }

  private stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  addEntry(url: string, title: string, favicon: string): void {
    const now = Date.now();
    const existing = this.entries.find((e) => e.url === url);

    if (existing) {
      existing.visitCount += 1;
      existing.timestamp = now;
      existing.title = title || existing.title;
      existing.favicon = favicon || existing.favicon;
    } else {
      this.entries.unshift({
        id: uuid_v7(),
        url,
        title: title || url,
        favicon: favicon || "",
        timestamp: now,
        visitCount: 1,
      });
    }

    this.scheduleSave();
  }

  getAll(): IHistoryEntry[] {
    return [...this.entries];
  }

  search(query: string): IHistoryEntry[] {
    const lower = query.toLowerCase();
    return this.entries.filter(
      (e) =>
        e.title.toLowerCase().includes(lower) ||
        e.url.toLowerCase().includes(lower),
    );
  }

  getRecent(limit: number = 10): IHistoryEntry[] {
    return this.entries.slice(0, limit);
  }

  updateEntryMetadata(url: string, title?: string, favicon?: string): void {
    const existing = this.entries.find((e) => e.url === url);
    if (existing) {
      if (title) existing.title = title;
      if (favicon) existing.favicon = favicon;
      this.scheduleSave();
    }
  }

  deleteEntry(id: string): void {
    this.entries = this.entries.filter((e) => e.id !== id);
    this.save();
  }

  clearAll(): void {
    this.entries = [];
    this.save();
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), DEBOUNCE_MS);
  }

  private save(): void {
    this.store.saveFiles(this.entries);
  }
}
