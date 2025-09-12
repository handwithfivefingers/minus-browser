import { app, BrowserWindow, desktopCapturer, Menu, Notification, screen, session } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import path from "node:path";
import { CommandController, ViewController } from "./features/browsers/controller";
if (started) {
  app.quit();
}

const preloadPath = path.join(__dirname, "/preload.js");
console.log("preloadPath", preloadPath);
if (process.platform !== "darwin") {
  Menu.setApplicationMenu(null);
}
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
class MinusBrowser {
  browser: BrowserWindow | null = null;
  constructor() {
    app.on("ready", () => {
      log.initialize();
    });

    app.on("quit", async () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
    app.on("before-quit", () => {
      console.log("sync data before quit");
      this.browser.webContents.session.flushStorageData();
    });
    app.on("render-process-gone", function (event, detailed) {
      app.quit();
    });
    app.whenReady().then(() => {
      this.createWindow();
    });
  }
  createWindow = async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
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
        session: session.defaultSession,
        enableDeprecatedPaste: true,
        sandbox: true,
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
    log.transports.console.format = "[LOGGER] - {h}:{i}:{s} > {text}";
    log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");
    new ViewController(browser);

    this.registerCommand();
    this.registerNotification();
    this.requestPermission();
    log.info = console.log;
  };
  registerCommand() {
    let gS: CommandController;
    this.browser.webContents.on("focus", () => {
      gS = new CommandController();
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

  requestPermission() {
    // session.defaultSession.setDisplayMediaRequestHandler(
    //   (request, callback) => {
    //     console.log("request", request);
    //     return desktopCapturer.getSources({ types: ["screen"] }).then((sources) => {
    //       callback({ video: sources[0], audio: "loopback" });
    //     });
    //   },
    //   {
    //     useSystemPicker: true,
    //   }
    // );
    // this.browser.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    //   callback({ video: request.frame });
    // });
    // this.browser.webContents.session.setPermissionCheckHandler((webContents, permission, request) => {
    //   console.log("permission", webContents, permission, request);
    //   return true;
    // });
    // this.browser.webContents.session.setPermissionRequestHandler((webContents, permission, request) => {
    //   console.log("permission", webContents, permission, request);
    //   return true;
    // });
  }
}
// Notification.requestPermission().then(r => {
//     console.log(r)
// }).catch(e =>{
//     console.log("e",e)
// })
new MinusBrowser();
