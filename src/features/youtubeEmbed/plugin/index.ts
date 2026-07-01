import { BrowserWindow, session, WebContentsView } from "electron";
import { extractVideoId } from "~/features/adblocker/services/youtube-embed";
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { eventStore } from "~/core/stores";

const OVERLAY_WIDTH = 400;
const OVERLAY_HEIGHT = Math.round((OVERLAY_WIDTH / 16) * 9);
const OVERLAY_OFFSET_X = 20;
const OVERLAY_OFFSET_Y = 80;

const DRAG_PREFIX = "__MINUS_YOUTUBE";

export class YoutubeEmbeddingPlugin implements ITabPlugin {
  readonly name = "YoutubeEmbedding";
  activeView: WebContentsView | null = null;
  private subWindow: BrowserWindow | null = null;
  private currentVideoId: string | null = null;
  private isYouTubeOverrideActive = false;
  private resizeHandler: (() => void) | null = null;
  private ownerTabWebContentsId: number | null = null;

  private taskIds: Map<string, BrowserWindow> = new Map();

  private isZoomed = false;
  private normalBounds = { x: 32, y: 32, width: OVERLAY_WIDTH, height: OVERLAY_HEIGHT };

  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    eventStore.listen("viewChanges", (view: WebContentsView | undefined) => {
      this.activeView = view || null;
      if (this.ownerTabWebContentsId && this.activeView?.webContents.id === this.ownerTabWebContentsId) {
        this.showOverlay();
      } else {
        this.hideOverlay();
      }
    });
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onUpdateTargetUrl = () => this.handleNavigate(ctx);
    hooks.onDestroy = () => this.destroyOverlay();
  }

  private getOverlayURL(videoId: string) {
    try {
      // @ts-ignore
      if (YOUTUBE_EMBED_VITE_DEV_SERVER_URL) {
        // @ts-ignore
        return `${YOUTUBE_EMBED_VITE_DEV_SERVER_URL}#${videoId}`;
      }
    } catch {}
    const filePath = path.join(__dirname, "../renderer/youtube_embeded/index.html");
    return `${pathToFileURL(filePath).toString()}#${videoId}`;
  }

  private handleNavigate(ctx: IExecutionContext) {
    const url = ctx.webContents.getURL();
    const videoId = extractVideoId(url);

    if (videoId) {
      if (videoId === this.currentVideoId && this.subWindow) {
        this.showOverlay();
        return;
      }

      this.currentVideoId = videoId;
      this.isYouTubeOverrideActive = true;

      this.createOverlay(videoId, ctx);
      ctx.webContents
        .executeJavaScript(
          `(function() {
        const wrapper = document.querySelector(".html5-video-player")
        if(wrapper) {
          const bounce = wrapper.getBoundingClientRect();
          console.log("__MINUS_YOUTUBE_EMBED_RESIZE__:" + JSON.stringify({
            y: bounce.top,
            x: bounce.left,
            dx: bounce.width,
            dy: bounce.height
          }));
          window.addEventListener("resize", () => {
            const bounce = wrapper.getBoundingClientRect();
            console.log("__MINUS_YOUTUBE_EMBED_RESIZE__:" + JSON.stringify({
              y: bounce.top,
              x: bounce.left,
              dx: bounce.width,
              dy: bounce.height
            }));
          })

          setInterval(() => {
            const video = wrapper.querySelector("video");
            if(video) {
              video.pause();
            }  
          },500)
        }
        })()`,
          false,
        )
        .catch((error) => {
          console.log("Inject code error", error);
        });
      this.taskIds.set(ctx.tabId, this.subWindow!);
    } else if (this.isYouTubeOverrideActive && url !== "about:blank") {
      this.destroyOverlay();
    }
  }

  private async createOverlay(videoId: string, ctx: IExecutionContext) {
    if (this.subWindow && !this.subWindow.webContents.isDestroyed()) {
      this.destroyOverlay();
    }

    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;

    this.subWindow = new BrowserWindow({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,
        session: session.fromPartition("minus-youtube-embed"),
      },
      transparent: true,
    });

    this.subWindow.setBackgroundColor("#00000000");

    this.normalBounds = {
      x: OVERLAY_OFFSET_X,
      y: OVERLAY_OFFSET_Y,
      width: OVERLAY_WIDTH,
      height: OVERLAY_HEIGHT,
    };
    this.subWindow.setBounds(this.normalBounds);

    this.ownerTabWebContentsId = (ctx.webContents as any).id;

    ctx.webContents.on("console-message", (_event, _level, message) => {
      if (!message.startsWith(DRAG_PREFIX)) return;
      const RESIZE_MSG = `${DRAG_PREFIX}_EMBED_RESIZE__:`;
      if (message.startsWith(RESIZE_MSG)) {
        const { x, y, dx, dy } = JSON.parse(message.slice(RESIZE_MSG.length));
        if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
        this.subWindow.setBounds({
          x,
          y,
          width: dx,
          height: dy,
        });
      }
    });
    this.subWindow.webContents.on("console-message", (_event, _level, message) => {
      if (!message.startsWith(DRAG_PREFIX)) return;

      const DRAG_MSG = `${DRAG_PREFIX}_EMBED_DRAG__:`;
      if (message.startsWith(DRAG_MSG)) {
        try {
          const { dx, dy } = JSON.parse(message.slice(DRAG_MSG.length));
          if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
          const bounds = this.subWindow.getBounds();
          this.subWindow.setBounds({
            x: bounds.x + dx,
            y: bounds.y + dy,
            width: bounds.width,
            height: bounds.height,
          });
        } catch {}
        return;
      }

      const MINIMIZE_MSG = `${DRAG_PREFIX}_EMBED_MINIMIZE__:`;
      if (message.startsWith(MINIMIZE_MSG)) {
        this.hideOverlay();
        return;
      }

      const ZOOM_MSG = `${DRAG_PREFIX}_EMBED_ZOOM__:`;
      if (message.startsWith(ZOOM_MSG)) {
        this.toggleZoom();
        return;
      }

      const CLOSE_MSG = `${DRAG_PREFIX}_EMBED_CLOSE__:`;
      if (message.startsWith(CLOSE_MSG)) {
        this.destroyOverlay();
        return;
      }
    });

    await this.subWindow.webContents.loadURL(this.getOverlayURL(videoId)).catch(() => {});

    this.resizeHandler = () => {
      if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
      const winBounds = win.getBounds();
      this.subWindow.setBounds({
        x: winBounds.width - OVERLAY_WIDTH - OVERLAY_OFFSET_X,
        y: OVERLAY_OFFSET_Y,
        width: OVERLAY_WIDTH,
        height: OVERLAY_HEIGHT,
      });
    };
    win.on("resize", this.resizeHandler);
  }

  private toggleZoom() {
    if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
    if (this.isZoomed) {
      this.subWindow.setBounds(this.normalBounds);
      this.isZoomed = false;
    } else {
      const win = BrowserWindow.getAllWindows()[0];
      if (!win) return;
      const winBounds = win.getBounds();
      this.normalBounds = this.subWindow.getBounds();
      this.subWindow.setBounds({ x: 0, y: 0, width: winBounds.width, height: winBounds.height });
      this.isZoomed = true;
    }
  }

  private destroyOverlay() {
    const win = BrowserWindow.getAllWindows()[0];

    if (this.resizeHandler) {
      if (win) win.off("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.subWindow) {
      if (!this.subWindow.webContents.isDestroyed()) {
        this.subWindow.webContents.close();
      }
      this.subWindow.destroy();
      this.subWindow = null;
    }

    this.currentVideoId = null;
    this.isYouTubeOverrideActive = false;
    this.ownerTabWebContentsId = null;
    this.isZoomed = false;
  }

  private hideOverlay() {
    if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
    this.subWindow.hide();
    this.subWindow.webContents.setBackgroundThrottling(true);
  }
  private showOverlay() {
    if (!this.subWindow || this.subWindow.webContents.isDestroyed()) return;
    this.subWindow.show();
    this.subWindow.webContents.setBackgroundThrottling(false);
  }
}
