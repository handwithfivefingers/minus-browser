import path from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, WebContentsView } from "electron";
import {
  openVaultCredentialPickerDialog,
  openVaultSaveConfirmDialog,
  openVaultManagerDialog,
} from "../../injection/ui/vaultDialogs";
import { Tab } from "~/features/system/classes/tab";
const SENTINEL = "__VAULT_RESOLVE__:";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function resolveVaultUrl(): string {
  if (
    // @ts-ignore
    typeof VAULT_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
    // @ts-ignore
    VAULT_INJECTION_VITE_DEV_SERVER_URL
  ) {
    // @ts-ignore
    return `${VAULT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") + "/";
  }
  const basePath = path.join(
    getSafeDirname(),
    // @ts-ignore
    // `../renderer/${VAULT_INJECTION_VITE_NAME}/ index.html`,
    `../renderer/main_window/src/features/injection/apps/vault/index.html`,
  );
  return pathToFileURL(basePath).toString();
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class VaultDialogController {
  async selectCredential(
    webContents: Electron.WebContents,
    candidates: { id: string; username: string; site: string }[],
  ) {
    const script = `(${openVaultCredentialPickerDialog.toString()})(${JSON.stringify(candidates)});`;
    return webContents.executeJavaScript(script, true);
  }

  async confirmSave(webContents: Electron.WebContents, data: { username: string; site: string }) {
    const script = `(${openVaultSaveConfirmDialog.toString()})(${JSON.stringify(data)});`;
    return webContents.executeJavaScript(script, true);
  }

  async openManager(win: BrowserWindow, tab: Tab, vaultItems: any[]): Promise<any[] | null> {
    try {
      return await this._openManagerWithView(win, tab, vaultItems);
    } catch (err) {
      console.warn("[VaultDialogController] openManager failed, falling back to legacy dialog:", err);
      const fallback = `(${openVaultManagerDialog.toString()})(${JSON.stringify(vaultItems || [])});`;
      return tab.webContents.executeJavaScript(fallback, true);
    }
  }

  private async _openManagerWithView(win: BrowserWindow, tab: Tab, vaultItems: any[]): Promise<any[] | null> {
    const requestId = `vault-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const vaultUrl = resolveVaultUrl();
    const tabBounds = tab.view.getBounds();
    const vaultView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });
    vaultView.setBounds(tabBounds);
    vaultView.setBackgroundColor("#00000000");
    win.contentView.addChildView(vaultView);

    return new Promise<any[] | null>((resolve, reject) => {
      let settled = false;
      let isReady = false;

      const onConsoleMessage = (_event: any, _level: any, message: string) => {
        console.log("onConsoleMessage level", _level);
        console.log("onConsoleMessage message", message);
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
          reject(new Error("vault-view-render-process-gone"));
        }
      };

      const teardown = (delayMs: number) => {
        // Detach named listeners only — never removeAllListeners().
        vaultView.webContents.off("console-message", onConsoleMessage);
        vaultView.webContents.off("render-process-gone", onRenderProcessGone);
        clearTimeout(readyTimer);

        // Wait for the renderer's CSS fade-out to finish, then remove the view.
        // No executeJavaScript here — the view may already be closing.
        setTimeout(() => {
          try {
            win.contentView.removeChildView(vaultView);
          } catch (_) {
            // View may already be removed if the window closed — safe to ignore.
          }
        }, delayMs);
      };

      const settle = (value: any[] | null) => {
        if (!isReady) return;
        // Signal the renderer to fade out (it handles its own CSS transition).
        // Fire-and-forget — we do NOT await or chain off this promise.
        if (!vaultView.webContents.isDestroyed()) {
          vaultView.webContents.executeJavaScript(`window.__vaultClose && window.__vaultClose();`).catch(() => {});
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
          reject(new Error("vault-view-ready-timeout"));
        }
      }, 8000);

      vaultView.webContents.on("console-message", onConsoleMessage);
      vaultView.webContents.on("render-process-gone", onRenderProcessGone);
      vaultView.webContents.once("did-finish-load", () => {
        if (isReady) return; // timeout already fired — do nothing
        isReady = true;

        const openPayload = JSON.stringify({
          requestId,
          items: vaultItems || [],
        });

        // This is a fire-and-forget executeJavaScript. We intentionally do
        // NOT attach a .catch() that calls reject() — delivery failure is
        // already covered by the readyTimer timeout path.
        vaultView.webContents
          .executeJavaScript(
            `(() => {
              const deliver = () => {
                window.dispatchEvent(
                  new CustomEvent("__vaultOpen", { detail: ${openPayload} })
                );
              };

              if (window.__vaultReady) {
                deliver();
                return;
              }

              // React useEffect is synchronous with the microtask queue.
              // One rAF is enough to guarantee the effect has run.
              requestAnimationFrame(() => {
                if (window.__vaultReady) {
                  deliver();
                  return;
                }
                // Absolute fallback: retry once after 200ms.
                setTimeout(() => {
                  if (window.__vaultReady) deliver();
                  // If still not ready, the 8s readyTimer will handle it.
                }, 200);
              });
            })();`,
          )
          .catch(() => {
            // Swallow — do NOT reject here. If delivery failed (e.g. view
            // was destroyed before did-finish-load resolved), the readyTimer
            // will fire and reject cleanly.
          });
      });

      vaultView.webContents.loadURL(vaultUrl).catch((err) => {
        if (!settled) {
          settled = true;
          teardown(0);
          reject(err);
        }
      });
    });
  }
}
