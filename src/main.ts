import { app, BrowserWindow, Menu, Notification, screen } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import path from "node:path";
import { LogController, ViewController } from "./features/browsers/controller";
if (started) {
  app.quit();
}

new LogController();

const preloadPath = path.join(__dirname, "/preload.js");

if (process.platform !== "darwin") {
  Menu.setApplicationMenu(null);
}
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
class MinusBrowser {
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
    const mainWindow = new BrowserWindow({
      width,
      height,
      show: false,
      frame: false,
      transparent: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: preloadPath,
      },
    });
    new Notification({
      title: "Minus Browser",
      body: "Welcome to Minus Browser!",
    }).show();
    /**@ts-ignore */
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      /**@ts-ignore */
      mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    mainWindow.show();
    if (process.env.NODE_ENV === "development") {
      mainWindow.webContents.openDevTools();
    }
    log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");
    new ViewController(mainWindow);
  };
}

new MinusBrowser();
