import path from "node:path";
import { pathToFileURL } from "node:url";
import { openUserScriptManagerDialog } from "../../injection/ui/userscriptManagerDialog";

export class UserScriptDialogController {
  async openManager(webContents: Electron.WebContents, scripts: any[]) {
    try {
      const requestId = `userscript-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let iframeSrc = "";
      if (
        // @ts-ignore
        typeof USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
        // @ts-ignore
        USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL
      ) {
        iframeSrc =
          // @ts-ignore
          `${USERSCRIPT_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") +
          "/";
      } else {
        // @ts-ignore
        const basePath = path.join(
          __dirname,
          // @ts-ignore
          `../renderer/${USERSCRIPT_INJECTION_VITE_NAME}/index.html`,
        );
        iframeSrc = pathToFileURL(basePath).toString();
      }

      const script = `(() => {
        const requestId = ${JSON.stringify(requestId)};
        const payload = ${JSON.stringify(scripts || [])};
        const iframeSrc = ${JSON.stringify(iframeSrc)};
        return new Promise((resolve, reject) => {
          const containerId = "__minus_userscript_react_overlay";
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

          let ready = false;
          const cleanup = () => {
            window.removeEventListener("message", onMessage);
            host.remove();
            // clearTimeout(resolveTimer);
            clearTimeout(readyTimer);
          };

          const readyTimer = setTimeout(() => {
            if (ready) return;
            cleanup();
            // reject(new Error("userscript injection not ready"));
          }, 700);

          // const resolveTimer = setTimeout(() => {
          //   cleanup();
          //   reject(new Error("userscript injection bridge timeout"));
          // }, 1200);

          const onMessage = (event) => {
            const data = event?.data;
            if (!data || data.source !== "minus-userscript-injection") return;
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
            reject(new Error("userscript iframe failed to load"));
          });
          host.appendChild(iframe);
          document.documentElement.appendChild(host);
        });
      })();`;
      return (await webContents.executeJavaScript(script, true)) as any[];
    } catch (error) {
      const fallback = `(${openUserScriptManagerDialog.toString()})(${JSON.stringify(scripts || [])});`;
      return (await webContents.executeJavaScript(fallback, true)) as any[];
    }
  }
}
