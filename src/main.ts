import { app, BrowserWindow, Menu, Notification } from "electron";
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
  try { await viewController?.persist(); } catch (error) { log.error("flushPersistenceOnQuit failed", error); }
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
    console.log("[ERROR] Create Window Error - ", error);
  }
}

app.on("ready", () => { log.initialize(); app.setAppUserModelId("com.minusbrowser.localdev"); });
app.on("before-quit", async (event) => {
  if (didRunBeforeQuit) return;
  didRunBeforeQuit = true;
  event.preventDefault();
  await flushPersistenceOnQuit();
  app.quit();
});
app.on("will-quit", flushPersistenceOnQuit);
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
app.on("render-process-gone", () => app.quit());

app.whenReady().then(async () => {
  await sessionInitPromise;
  await createWindow();
  if (menuApplication?.menu) Menu.setApplicationMenu(menuApplication?.menu);
});
