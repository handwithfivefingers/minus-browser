import { app, BrowserWindow, screen, session } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import path from "node:path";
import { LogController } from "./features/browsers/controller";
import { CustomAppController } from "./features/browsers/controller/customAppController";
import { ViewController } from "./features/browsers/controller/viewController";
if (started) {
  app.quit();
}
new LogController();

new CustomAppController();
const preloadPath = path.join(__dirname, "/preload.js");

let viewController: ViewController;

// Menu.setApplicationMenu(null);

class MinusBrowser {
  adblockEnabled = false;
  aggressiveAdblockActivated = false;
  constructor() {
    app.on("ready", () => {
      log.initialize();
    });

    // app.on("before-quit", async () => {
    //   // await viewController.cloudSave();
    //   viewController.destroy();
    //   viewController = null as unknown as ViewController;
    // });
    app.on("quit", async () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });

    app.on("activate", () => {
      // On OS X it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });

    app.whenReady().then(() => {
      this.createWindow();
    });
  }
  createWindow = async () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    // const ses = session.fromPartition("persist:browser");

    const mainWindow = new BrowserWindow({
      width,
      height,
      show: false,
      frame: false,
      transparent: true,
      // alwaysOnTop: true,
      webPreferences: {
        // session: ses,
        nodeIntegration: true,
        contextIsolation: true,
        preload: preloadPath,

        // partition: "persist:browser",
      },
    });

    // mainWindow.webContents.setUserAgent(
    //   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/237.84.2.178 Safari/537.36"
    // );
    // and load the index.html of the app.

    /**@ts-ignore */
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      /**@ts-ignore */
      mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }

    mainWindow.show();
    // if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
    // }
    log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");
    viewController = new ViewController(mainWindow);
  };
}

new MinusBrowser();
