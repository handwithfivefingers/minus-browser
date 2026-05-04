import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  openVaultCredentialPickerDialog,
  openVaultManagerDialog,
  openVaultSaveConfirmDialog,
} from "../../injection/ui/vaultDialogs";

export class VaultDialogController {
  async selectCredential(
    webContents: Electron.WebContents,
    candidates: { id: string; username: string; site: string }[],
  ) {
    const script = `(${openVaultCredentialPickerDialog.toString()})(${JSON.stringify(candidates)});`;
    return webContents.executeJavaScript(script, true);
  }

  async confirmSave(
    webContents: Electron.WebContents,
    data: { username: string; site: string },
  ) {
    const script = `(${openVaultSaveConfirmDialog.toString()})(${JSON.stringify(data)});`;
    return webContents.executeJavaScript(script, true);
  }

  async openManager(webContents: Electron.WebContents, vaultItems: any[]) {
    try {
      const requestId = `vault-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let iframeSrc = "";
      if (
        // @ts-ignore
        typeof VAULT_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
        // @ts-ignore
        VAULT_INJECTION_VITE_DEV_SERVER_URL
      ) {
        iframeSrc =
          // @ts-ignore
          `${VAULT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") + "/";
      } else {
        // @ts-ignore
        const basePath = path.join(
          __dirname,
          // @ts-ignore
          `../renderer/${VAULT_INJECTION_VITE_NAME}/index.html`,
        );
        iframeSrc = pathToFileURL(basePath).toString();
      }

      const script = `(() => {
        const requestId = ${JSON.stringify(requestId)};
        const payload = ${JSON.stringify(vaultItems || [])};
        const iframeSrc = ${JSON.stringify(iframeSrc)};
        return new Promise((resolve, reject) => {
          const containerId = "__minus_vault_react_overlay";
          const old = document.getElementById(containerId);
          if (old) old.remove();

          const host = document.createElement("div");
          host.id = containerId;
          host.style.position = "fixed";
          host.style.inset = "0";
          host.style.zIndex = "2147483647";
          host.style.opacity = "0";
          host.style.transition = "opacity 90ms ease";

          const iframe = document.createElement("iframe");
          iframe.src = iframeSrc;
          iframe.style.width = "100%";
          iframe.style.height = "100%";
          iframe.style.border = "0";
          iframe.style.background = "transparent";

          const cleanup = () => {
            window.removeEventListener("message", onMessage);
            host.remove();
            // clearTimeout(resolveTimer);
            clearTimeout(readyTimer);
          };

          let ready = false;
          const readyTimer = setTimeout(() => {
            if (ready) return;
            cleanup();
          }, 700);
          const onMessage = (event) => {
            const data = event?.data;
            if (!data || data.source !== "minus-vault-injection") return;
            if (data.type === "READY") {
              ready = true;
              host.style.opacity = "1";
              iframe.contentWindow?.postMessage(
                {
                  source: "minus-parent",
                  type: "OPEN",
                  payload: { requestId, items: payload },
                },
                "*",
              );
              return;
            }
            if (data.type === "RESOLVE" && data.requestId === requestId) {
              cleanup();
              resolve(data.payload ?? null);
            }
          };

          window.addEventListener("message", onMessage);
          iframe.addEventListener("error", () => {
            cleanup();
            reject(new Error("vault iframe failed to load"));
          });
          iframe.addEventListener("load", () => {});

          host.appendChild(iframe);
          document.documentElement.appendChild(host);
        });
      })();`;
      return await webContents.executeJavaScript(script, true);
    } catch (_error) {
      console.log("_error", _error);
      const fallback = `(${openVaultManagerDialog.toString()})(${JSON.stringify(vaultItems || [])});`;
      return webContents.executeJavaScript(fallback, true);
    }
  }
}
