import { app, BrowserWindow } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import { Tab } from "~/features/tabs/models/tab";
import { minusSessionManager } from "~/features/system/services/session";

type SpotlightOpenPayload = {
  query?: string;
  tabs?: ReturnType<Tab["toJSON"]>[];
};

type Bounds = { x: number; y: number; width: number; height: number };

const preloadPath = path.join(__dirname, "/preload.js");
const boundsPath = path.join(app.getPath("userData"), "spotlight-bounds.json");

function loadBounds(): Bounds | null {
  try {
    if (fs.existsSync(boundsPath)) {
      return JSON.parse(fs.readFileSync(boundsPath, "utf-8"));
    }
  } catch {}
  return null;
}

function saveBounds(bounds: Bounds) {
  try {
    fs.writeFileSync(boundsPath, JSON.stringify(bounds), "utf-8");
  } catch {}
}

export class SpotlightService {
  isOpen = false;
  window: BrowserWindow | null = null;

  eventListeners = new Map<string, Function>();

  private getSpotlightURL() {
    /**@ts-ignore */
    if (SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      return SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL;
    }
    const filePath = path.join(__dirname, `../renderer/spotlight_window/index.html`);
    return pathToFileURL(filePath).toString();
  }

  private async ensureWindowLoaded() {
    const win = this.ensureWindow();
    const spotlightURL = this.getSpotlightURL();
    console.log("spotlightURL", spotlightURL);
    if (win.webContents.getURL()) return win;
    await win.loadURL(spotlightURL);
    return win;
  }

  private getWindowOptions() {
    const parent = BrowserWindow.getFocusedWindow();
    const bounds = loadBounds() ?? parent?.getBounds();
    return {
      width: bounds?.width ?? 960,
      height: bounds?.height ?? 640,
      x: bounds?.x ?? undefined,
      y: bounds?.y ?? undefined,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: true,
      focusable: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: "#00000000",
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        backgroundThrottling: false,
        session: minusSessionManager.session,
      },
    } as const;
  }

  private ensureWindow() {
    if (this.window && !this.window.isDestroyed()) return this.window;

    this.window = new BrowserWindow(this.getWindowOptions());
    this.window.on("closed", () => {
      this.window = null;
      this.isOpen = false;
    });
    return this.window;
  }

  async warmup() {
    const win = this.ensureWindow();
    if (!win.webContents.getURL()) {
      win.loadURL(this.getSpotlightURL()).catch(() => {});
    }
    if (win.webContents.isLoading()) {
      await new Promise<void>((resolve) => win.webContents.once("did-finish-load", resolve));
    }
  }

  async openSpotlight(payload?: SpotlightOpenPayload) {
    const spotlightWindow = await this.ensureWindowLoaded();
    const sendPayload = () => {
      spotlightWindow.webContents.send("GET_TABS", payload?.tabs || []);
      spotlightWindow.webContents.send("SPOTLIGHT_OPEN", {
        query: payload?.query || "",
      });
      spotlightWindow.show();
      spotlightWindow.focus();
      spotlightWindow.setAlwaysOnTop(true, "screen-saver");
      this.isOpen = true;
    };

    if (spotlightWindow.webContents.isLoading()) {
      spotlightWindow.webContents.once("did-finish-load", sendPayload);
      return;
    }

    const closeCallback = () => this.close();

    this.eventListeners.set("SPOTLIGHT_CLOSED", closeCallback);
    if (closeCallback) {
      spotlightWindow.on("blur", closeCallback);
    }
    sendPayload();
  }

  syncTabs(tabs: ReturnType<Tab["toJSON"]>[]) {
    if (!this.window || this.window.isDestroyed()) return;
    this.window.webContents.send("GET_TABS", tabs);
  }

  async close() {
    if (!this.window || this.window.isDestroyed()) return;
    this.isOpen = false;
    const bounds = this.window.getBounds();
    saveBounds(bounds);
    this.window.hide();
    const spotlightWindow = await this.ensureWindowLoaded();
    const closeCallback = this.eventListeners.get("SPOTLIGHT_CLOSED");
    /**@ts-ignore */
    if (closeCallback) spotlightWindow.off("blur", closeCallback);
  }

  destroy() {
    if (!this.window || this.window.isDestroyed()) return;
    this.isOpen = false;
    this.window.close();
    this.window = null;
  }
}
