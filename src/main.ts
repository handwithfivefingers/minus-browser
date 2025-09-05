import { app, BrowserWindow, screen } from "electron";
import log from "electron-log";
import started from "electron-squirrel-startup";
import path from "node:path";
import { LogController } from "./features/browsers/controller";
import { CustomAppController } from "./features/browsers/controller/customAppController";
import { ViewController } from "./features/browsers/controller/viewController";
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
new LogController();

new CustomAppController();
const preloadPath = path.join(__dirname, "/preload.js");
let viewController: ViewController;
const createWindow = () => {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;
  const mainWindow = new BrowserWindow({
    width,
    height,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: preloadPath,
    },
  });
  mainWindow.webContents.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/237.84.2.178 Safari/537.36"
  );
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }
  log.info("Main window created with size:", { width, height });
  log.transports.file.resolvePathFn = () => path.join(app.getPath("userData"), "logs/main.log");

  mainWindow.show();
  viewController = new ViewController(mainWindow);
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
// const NOTIFICATION_TITLE = "App started";
// const NOTIFICATION_BODY = "Notification from the Main process";

// function showNotification() {
//   new Notification({ title: NOTIFICATION_TITLE, body: NOTIFICATION_BODY }).show();
// }

app.on("ready", () => {
  log.initialize();
  // app.setAppUserModelId("TruyenMV_123456");
  // showNotification();
});
app.whenReady().then(() => {
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("before-quit", async () => {
  await viewController.cloudSave();
  viewController.destroy();
  viewController = null;
});
app.on("quit", async () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
