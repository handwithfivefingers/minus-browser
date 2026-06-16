import { BrowserWindow, screen } from "electron";
import path from "node:path";
const preloadPath = path.join(__dirname, "/preload.js");

class PrimaryWindow {
  window: BrowserWindow;
  constructor() {
    const dimention = this.resolveDimension();
    this.window = new BrowserWindow({
      width: dimention.width,
      height: dimention.height,
      show: false,
      frame: false,
      transparent: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: preloadPath,
        // session: this.minusSession,
      },
    });
  }

  resolveWindowURL() {
    /**@ts-ignore */
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      return MAIN_WINDOW_VITE_DEV_SERVER_URL;
    } else {
      /**@ts-ignore */
      return path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`);
    }
  }

  resolveDimension() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    return { width, height };
  }

  setUserAgent() {
    this.window.webContents.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/237.84.2.178 Safari/537.36",
    );
  }
}

export const Browser = new PrimaryWindow();
