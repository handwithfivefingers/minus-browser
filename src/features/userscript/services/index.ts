// @ts-nocheck
import { BrowserWindow, WebContentsView } from "electron";
import { eventStore } from "~/features/system/stores/minusEventEmitter";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { IUserScript } from "../types";
function getSafeDirname(): string {
  if (typeof __dirname !== "undefined") return __dirname;
  // @ts-ignore
  if (typeof import.meta?.dirname !== "undefined") return import.meta.dirname;
  // @ts-ignore
  if (typeof import.meta?.url !== "undefined") {
    // @ts-ignore
    return path.dirname(new URL(import.meta.url).pathname);
  }
  throw new Error("Cannot resolve __dirname in current module context");
}

function resolveUserScriptUrl(): string {
  if (
    // @ts-ignore
    typeof USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
    // @ts-ignore
    USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL
  ) {
    return (
      // @ts-ignore
      `${USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") + "/"
    );
  }
  const basePath = path.join(
    getSafeDirname(),
    // @ts-ignore
    `../renderer/main_window/src/features/userscript/overlay/index.html`,
  );
  return pathToFileURL(basePath).toString();
}

const SENTINEL = "__USER_SCRIPT_RESOLVE__:";

export class UserScriptService {
  async openManager(view: WebContentsView, scripts: IUserScript[]) {
    try {
      const win = BrowserWindow.getFocusedWindow();
      const requestId = `userscript-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const userScriptUrl = resolveUserScriptUrl();
      const tabBounds = view.getBounds();
      const userScriptView = new WebContentsView({
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: false,
        },
      });
      userScriptView.setBounds(tabBounds);
      userScriptView.setBackgroundColor("#00000000");
      win.contentView.addChildView(userScriptView);

      return new Promise<any[] | null>((resolve, reject) => {
        let isReady = false;
        const onConsoleMessage = (_event: any, _level: any, message: string) => {
          // console.log("onConsoleMessage level", _level);
          // console.log("onConsoleMessage message", message);
          if (!message.startsWith(SENTINEL)) return;
          try {
            const json = message.slice(SENTINEL.length);
            const data = JSON.parse(json);
            if (data?.requestId !== requestId) return;
            settle(Array.isArray(data.payload) ? data.payload : null);
          } catch {
            // Malformed — ignore, do NOT reject here.
          }
        };

        const onRenderProcessGone = () => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(new Error("user-script-view-render-process-gone"));
          }
        };

        const teardown = (delayMs: number) => {
          // Detach named listeners only — never removeAllListeners().
          userScriptView.webContents.off("console-message", onConsoleMessage);
          userScriptView.webContents.off("render-process-gone", onRenderProcessGone);
          clearTimeout(readyTimer);

          // Wait for the renderer's CSS fade-out to finish, then remove the view.
          // No executeJavaScript here — the view may already be closing.
          setTimeout(() => {
            try {
              win.contentView.removeChildView(userScriptView);
            } catch (_) {
              // View may already be removed if the window closed — safe to ignore.
            }
          }, delayMs);
        };

        const settle = (value: any[] | null) => {
          if (!isReady) return;
          // Signal the renderer to fade out (it handles its own CSS transition).
          // Fire-and-forget — we do NOT await or chain off this promise.
          if (!userScriptView.webContents.isDestroyed()) {
            userScriptView.webContents
              .executeJavaScript(`window.__userScriptClose && window.__userScriptClose();`)
              .catch(() => {});
          }
          // Tear down after the renderer's 120ms fade-out transition completes.
          teardown(150);
          resolve(value);
        };

        /**
         * Check and fallback Legacy Dialog on Time
         */
        const readyTimer = setTimeout(() => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(new Error("user-script-view-ready-timeout"));
          }
        }, 8000);

        userScriptView.webContents.on("console-message", onConsoleMessage);
        userScriptView.webContents.on("render-process-gone", onRenderProcessGone);
        userScriptView.webContents.once("did-finish-load", () => {
          if (isReady) return; // timeout already fired — do nothing
          isReady = true;

          const openPayload = JSON.stringify({
            requestId,
            items: scripts || [],
          });

          // This is a fire-and-forget executeJavaScript. We intentionally do
          // NOT attach a .catch() that calls reject() — delivery failure is
          // already covered by the readyTimer timeout path.
          const scriptToInject = `(async (data) => {
            const deliver = () => window.dispatchEvent(new CustomEvent("__userScriptOpen", { detail: data }));

            // Check immediately
            if (window.__userScriptReady) return deliver();

            // Wait for the 'ready' state using a MutationObserver or Polling
            // Polling is often more reliable for custom global flags
            const poll = setInterval(() => {
              if (window.__userScriptReady) {
                deliver();
                clearInterval(poll);
              }
            }, 50);

            // Auto-cleanup after 5 seconds to prevent memory leaks
            setTimeout(() => clearInterval(poll), 5000);
          })(${openPayload})`;

          userScriptView.webContents.executeJavaScript(scriptToInject).catch((err) => {
            console.log("error", err);
          });
        });

        userScriptView.webContents.loadURL(userScriptUrl).catch((err) => {
          if (!isReady) {
            isReady = true;
            teardown(0);
            reject(err);
          }
        });
      });
    } catch (error) {
      console.log("user script error", error);
    }
  }
}
