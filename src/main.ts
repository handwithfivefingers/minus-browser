import { app, BrowserWindow, Menu, Notification, systemPreferences } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import { findbarService } from "./features/findbar/service";
import { ViewController } from "./core/controller/viewController";
import { CommandController } from "./core/controller/commandController";
import { menuApplication } from "./core/services/menu";
import { browserSession, sessionInitPromise } from "./core/services/session";
import { createMainWindow, loadAppURL, setupUserAgent, setupWindowCrashHandlers, setupLogging } from "./core/window";

Object.assign(console, log.functions);
if (started) app.quit();

Menu.setApplicationMenu(null);

let browser: BrowserWindow | null = null;
let viewController: ViewController | null = null;
let isPersistingBeforeQuit = false;
let didRunBeforeQuit = false;

async function flushPersistenceOnQuit() {
  if (isPersistingBeforeQuit) return;
  isPersistingBeforeQuit = true;
  try {
    await viewController?.persist();
  } catch (error) {
    log.error("flushPersistenceOnQuit failed", error);
  }
}

async function createWindow() {
  try {
    const win = await createMainWindow({ session: browserSession });
    setupUserAgent(win, browserSession);
    browser = win;

    viewController = new ViewController(win);
    findbarService.init(win);
    await viewController.ready();

    if (Notification.isSupported()) {
      new Notification({ title: "Minus Browser", body: "Welcome to Minus Browser!" }).show();
    }

    const commandController = new CommandController(viewController);
    menuApplication.rebuild(commandController.menuItems);

    win.webContents.on("did-finish-load", () => viewController?.syncTabsToWindows());
    setupWindowCrashHandlers(win);
    setupLogging();
    loadAppURL(win);
    win.show();
    if (process.env.NODE_ENV === "development") win.webContents.openDevTools();
  } catch (error) {
    console.error("[ERROR] Create Window Error - ", error);
  }
}

app.on("ready", () => {
  log.initialize();
  app.setAppUserModelId("com.minusbrowser.localdev");
});
app.on("before-quit", async (event) => {
  if (didRunBeforeQuit) return;
  didRunBeforeQuit = true;
  event.preventDefault();
  await flushPersistenceOnQuit();
  app.quit();
});
app.on("will-quit", flushPersistenceOnQuit);
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("render-process-gone", () => app.quit());

app.whenReady().then(async () => {
  if (process.platform === "darwin") {
    for (const media of ["microphone", "camera"] as const) {
      try {
        const status = systemPreferences.getMediaAccessStatus(media);
        if (status === "not-determined") {
          const granted = await systemPreferences.askForMediaAccess(media);
          if (granted) {
            console.log(`${media} access granted!`);
          }
        } else if (status === "denied") {
          console.warn(
            `${media} access denied at OS level — go to System Settings → Privacy & Security → ${media === "microphone" ? "Microphone" : "Camera"} to enable`,
          );
        }
      } catch (err) {
        console.error(`Failed to request ${media} access:`, err);
      }
    }
  }
  await sessionInitPromise;
  await createWindow();
  if (menuApplication?.menu) Menu.setApplicationMenu(menuApplication?.menu);
});
