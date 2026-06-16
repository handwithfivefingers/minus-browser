import { session, app } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { cacheSystem } from "~/features/cacheSystem";
import { debounce } from "~/shared/utils";
import { StoreManager } from "../../stores";
export const MINUS_BROWSER_PARTITION = "persist:minus-browser";

export class SimpleSessionManager {
  private readonly browserSession: Electron.Session;
  private readonly sessionStore: StoreManager = new StoreManager("session");
  private isLoaded = false;
  private isWatching = false;

  constructor(partition: string) {
    this.browserSession = session.fromPartition(partition, { cache: true });
    this.sessionStore.initialize("session");
  }

  get session() {
    return this.browserSession;
  }

  async save(filePath = this.sessionStore.configFile) {
    const cookies = await this.browserSession.cookies.get({});
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(cookies, null, 2), "utf-8");
    cacheSystem.set("session", cookies);
    console.log(`Đã lưu ${cookies.length} cookies`);
  }

  async load(filePath = this.sessionStore.configFile) {
    if (this.isLoaded) return;
    this.isLoaded = true;

    const raw = await fs.readFile(filePath, "utf-8").catch(() => null);
    if (!raw) return;

    const parsed = this.parseCookies(raw);
    const cookies = Array.isArray(parsed) ? parsed : Object.values(parsed).flat();
    if (!cookies.length) return;

    await Promise.allSettled(
      cookies.map((cookie) => {
        if (!cookie.domain || !cookie.name) return Promise.resolve();

        return this.browserSession.cookies.set({
          url: `http${cookie.secure ? "s" : ""}://${cookie.domain.replace(/^\./, "")}`,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || "/",
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
          sameSite: "no_restriction",
        });
      }),
    );

    cacheSystem.set("session", cookies);
    console.log(`Đã load ${cookies.length} cookies`);
  }

  watch(filePath = this.sessionStore.configFile) {
    if (this.isWatching) return;
    this.isWatching = true;

    this.browserSession.cookies.on(
      "changed",
      debounce(() => {
        this.save(filePath).catch((error) => {
          console.log("Lỗi lưu cookie:", error);
        });
      }, 500),
    );
  }

  private parseCookies(raw: string): Electron.Cookie[] | Record<string, Electron.Cookie[]> {
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.log("Lỗi đọc cookie từ file:", error);
      return [];
    }
  }
}

let minusSessionManager: SimpleSessionManager;
app.whenReady().then(() => (minusSessionManager = new SimpleSessionManager(MINUS_BROWSER_PARTITION)));
export { minusSessionManager };
