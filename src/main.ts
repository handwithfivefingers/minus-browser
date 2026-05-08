import { app, BrowserWindow, Menu, Notification, screen, session } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import path from "node:path";
import { CommandController, ViewController } from "./features/system/controller";
import { StoreManager } from "./features/system";

Object.assign(console, log.functions);

if (started) {
  app.quit();
}
const preloadPath = path.join(__dirname, "/preload.js");

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

if (process.platform !== "darwin") {
  Menu.setApplicationMenu(null);
}
class MinusBrowser {
  browser: BrowserWindow | null = null;
  interfaceStore: StoreManager = new StoreManager("interface");
  minusSession: Electron.Session | undefined = undefined;
  viewController: ViewController | null = null;
  isPersistingBeforeQuit = false;
  didRunBeforeQuit = false;
  constructor() {
    this.initialize();
  }

  private flushPersistenceOnQuit = async () => {
    if (this.isPersistingBeforeQuit) return;
    this.isPersistingBeforeQuit = true;
    try {
      await this.viewController?.persist();
      await this.browser?.webContents.session.flushStorageData();
      await this.minusSession?.cookies.flushStore();
    } catch (error) {
      log.error("flushPersistenceOnQuit failed", error);
    }
  };

  async initialize() {
    app.on("ready", () => {
      log.initialize();
    });
    app.on("before-quit", async (event) => {
      if (this.didRunBeforeQuit) return;
      this.didRunBeforeQuit = true;
      event.preventDefault();
      await this.flushPersistenceOnQuit();
      app.quit();
    });
    app.on("will-quit", async () => {
      await this.flushPersistenceOnQuit();
    });
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
    app.on("render-process-gone", function (event, detailed) {
      app.quit();
    });

    app.whenReady().then(async () => {
      this.createWindow();
    });
  }
  createWindow = async () => {
    try {
      const primaryDisplay = screen.getPrimaryDisplay();
      const { width, height } = primaryDisplay.workAreaSize;
      this.minusSession = session.fromPartition("persist:minus-browser");
      const browser = new BrowserWindow({
        width,
        height,
        show: false,
        frame: false,
        transparent: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: true,
          preload: preloadPath,
          session: this.minusSession,
          // sandbox: true,
        },
      });

      this.browser = browser;

      /**@ts-ignore */
      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        /**@ts-ignore */
        browser.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      } else {
        /**@ts-ignore */
        browser.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
      }
      browser.show();
      if (process.env.NODE_ENV === "development") {
        browser.webContents.openDevTools();
      }

      browser.webContents?.on("render-process-gone", function (event, detailed) {
        log.info("!crashed, reason: " + detailed.reason + ", exitCode = " + detailed.exitCode);
        if (detailed.reason == "crashed") {
          browser.webContents?.reload();
        } else {
          app.relaunch({ args: process.argv.slice(1).concat(["--relaunch"]) });
          app.exit(0);
        }
      });

      browser.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
        console.log("Failed to load:", errorCode, errorDescription);
      });
      log.transports.console.format = "[LOGGER] - {h}:{i}:{s} > {text}";
      log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");

      const viewController = new ViewController(browser);
      this.viewController = viewController;
      this.registerNotification();
      this.registerCommand(viewController);
    } catch (error) {
      console.log("[ERROR] Create Window Error - ", error);
    }
  };
  registerCommand(viewController: ViewController) {
    let gS: CommandController;
    if (!this.browser) return;
    this.browser.on("focus", () => {
      gS = new CommandController(viewController);
    });
    this.browser.on("hide", () => {
      gS?.destroy();
    });
    this.browser.on("blur", () => {
      gS?.destroy();
    });
    this.browser.on("closed", () => {
      gS?.destroy();
    });
  }

  registerNotification() {
    this.showNotification();
  }
  showNotification() {
    new Notification({
      title: "Minus Browser",
      body: "Welcome to Minus Browser!",
    }).show();
  }
}
new MinusBrowser();
