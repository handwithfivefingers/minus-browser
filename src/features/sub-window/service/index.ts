import { BrowserWindow, ipcMain, session, WebContentsView } from "electron";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SUB_WINDOW_INVOKE, SUB_WINDOW_EMIT, SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";
import { IPC_EMIT_CHANNEL } from "~/shared/constants/ipc";

const preloadPath = path.join(__dirname, "/preload.js");

interface PendingRequest {
  resolve: (data: any) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class SubWindowService {
  isOpen = false;
  private view: WebContentsView | null = null;
  private mainWindow: BrowserWindow | null = null;
  private resizeHandler: (() => void) | null = null;
  private blurHandler: (() => void) | null = null;
  private readyPromise: Promise<void> | null = null;
  private pendingRequests = new Map<string, PendingRequest>();
  private lastOpenTime = 0;

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;

    ipcMain.handle(SUB_WINDOW_INVOKE.RESOLVE, (_event, data: { requestId?: string; payload?: any }) => {
      this.resolveRequest(data);
      return { success: true };
    });
  }

  resolveRequest(data: { requestId?: string; payload?: any }) {
    const requestId = data?.requestId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const pending = this.pendingRequests.get(requestId)!;
      clearTimeout(pending.timer);
      this.pendingRequests.delete(requestId);
      pending.resolve(data.payload ?? data);
      this.close();
    }
  }

  private getURL() {
    try {
      /**@ts-ignore */
      if (SUB_WINDOW_VITE_DEV_SERVER_URL) {
        /**@ts-ignore */
        return SUB_WINDOW_VITE_DEV_SERVER_URL;
      }
    } catch {}
    const filePath = path.join(__dirname, "../renderer/sub_window/index.html");
    return pathToFileURL(filePath).toString();
  }

  private syncViewBounds() {
    if (!this.mainWindow || !this.view) return;
    const { width, height } = this.mainWindow.getBounds();
    this.view.setBounds({ x: 0, y: 0, width, height });
  }

  async warmup(): Promise<void> {
    if (this.readyPromise) {
      if (this.view && !this.view.webContents.isDestroyed()) {
        return this.readyPromise;
      }
      this.readyPromise = null;
      this.view = null;
    }
    this.readyPromise = this.initView();
    return this.readyPromise;
  }

  private async initView() {
    if (this.view) return;
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: preloadPath,
        backgroundThrottling: false,
        session: session.fromPartition("minus-sub-window"),
        transparent: true,
      },
    });
    this.view.setBackgroundColor("#00000000");
    await this.view.webContents.loadURL(this.getURL()).catch(() => {});
  }

  ensureOnTop() {
    if (!this.isOpen || !this.mainWindow || !this.view) return;
    try {
      this.mainWindow.contentView.removeChildView(this.view);
    } catch {}
    this.mainWindow.contentView.addChildView(this.view);
  }

  async open(route: string, payload?: any): Promise<any> {
    if (!this.mainWindow) return;
    await this.warmup();
    if (!this.view) return;
    if (this.view.webContents.isDestroyed()) return;

    this.syncViewBounds();

    if (payload) {
      this.view.webContents.send(SUB_WINDOW_EMIT.PAYLOAD, payload);
    }
    this.view.webContents.send(SUB_WINDOW_EMIT.NAVIGATE, { route });

    this.mainWindow.contentView.addChildView(this.view);
    this.view.webContents.focus();
    this.isOpen = true;
    this.lastOpenTime = Date.now();

    this.resizeHandler = () => this.syncViewBounds();
    this.mainWindow.on("resize", this.resizeHandler);

    this.blurHandler = () => this.close();
    this.mainWindow.on("blur", this.blurHandler);

    return true;
  }

  async openWithResult(route: string, payload?: any, timeoutMs = 30000): Promise<any> {
    const requestId = `sub-${route}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.open(route, { requestId, ...payload });

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.close();
        reject(new Error(`Sub-window ${route} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      this.pendingRequests.set(requestId, { resolve, reject, timer });
    });
  }

  close() {
    if (!this.isOpen || !this.mainWindow || !this.view) return;
    // Ignore close if opened less than 300ms ago (prevents focus()
    // from triggering a BrowserWindow blur that closes immediately)
    if (Date.now() - this.lastOpenTime < 300) return;
    this.isOpen = false;

    for (const [, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error("Sub-window closed"));
    }
    this.pendingRequests.clear();

    if (this.resizeHandler) {
      this.mainWindow.off("resize", this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.blurHandler) {
      this.mainWindow.off("blur", this.blurHandler);
      this.blurHandler = null;
    }

    if (!this.view.webContents.isDestroyed()) {
      this.view.webContents.send(SUB_WINDOW_EMIT.NAVIGATE, { route: "/" });
    }

    try {
      this.mainWindow.contentView.removeChildView(this.view);
    } catch {}
  }

  send(channel: string, data?: any) {
    if (!this.view || this.view.webContents.isDestroyed()) return;
    this.view.webContents.send(channel, data);
  }

  destroy() {
    this.close();
    if (this.view) {
      this.view.webContents.close();
      this.view = null;
    }
    this.readyPromise = null;
  }
}

export const subWindowService = new SubWindowService();
