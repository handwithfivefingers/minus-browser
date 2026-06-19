import { BrowserWindow, session, app } from "electron";
import {
  migrateUserData,
  needsLegacyCookieMigration,
  readLegacySessionCookies,
  removeLegacySessionFile,
  detectVersionChange,
  writeVersionInfo,
} from "./migrator";

export const MINUS_BROWSER_PARTITION = "persist:minus-browser";

export function createSession(): Electron.Session {
  return session.fromPartition(MINUS_BROWSER_PARTITION, { cache: true });
}

let browserSession: Electron.Session;
const sessionInitPromise = app.whenReady().then(async () => {
  await migrateUserData();
  browserSession = createSession();

  await migrateLegacyCookies();
  await handleVersionChange();
  await writeVersionInfo(app.getPath("userData"));

  forwardCookieChanges();
});

async function migrateLegacyCookies() {
  const userData = app.getPath("userData");
  if (!(await needsLegacyCookieMigration(userData))) return;

  const cookies = await readLegacySessionCookies(userData);
  if (cookies && cookies.length > 0) {
    const results = await Promise.allSettled(
      cookies.map((cookie) => {
        if (!cookie.domain || !cookie.name) return Promise.resolve();

        const url = `http${cookie.secure ? "s" : ""}://${cookie.domain.replace(/^\./, "")}`;
        return browserSession.cookies.set({
          url,
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path || "/",
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          expirationDate: cookie.expirationDate,
          sameSite: cookie.sameSite || "lax",
        });
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    console.log(`[Migration] Restored ${succeeded}/${cookies.length} cookies from legacy session.json`);
  }

  await removeLegacySessionFile(userData);
}

async function handleVersionChange() {
  const userData = app.getPath("userData");
  const change = await detectVersionChange(userData);

  if (change.electronMajorChanged) {
    console.log(
      `[Version] Electron major version changed — clearing all storage data`,
    );
    await browserSession.clearStorageData();
    return;
  }

  if (change.appChanged) {
    // Rely on Electron's native partition SQLite store — re-importing via
    // cookies.set() strips third-party attributes and breaks Google auth.
    console.log(
      `[Version] App version changed (${app.getVersion()}) — keeping native cookie store`,
    );
  }
}

function forwardCookieChanges() {
  browserSession.cookies.on("changed", (_event, cookie, cause, removed) => {
    if (cause === "explicit" || cause === "overwrite") {
      const win = BrowserWindow.getAllWindows()[0];
      win?.webContents.send("COOKIE_CHANGED", { cookie, removed });
    }
  });
}

export { browserSession, sessionInitPromise };
