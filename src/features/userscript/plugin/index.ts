import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { userScriptController } from "../controllers";
import { parseUserScriptMetadata } from "../parser";

// import { ipcMain } from "electron";
// import { IPC } from "~/features/system";

export class UserScriptTabPlugin implements ITabPlugin {
  readonly name = "userScript";
  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer;
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onDidStopLoad = async () => {
      this.runMatchedUserScripts(ctx.url, ctx);
    };
  }

  /**
   *
   * @param url
   * @deprecated runAt: "document-start" | "document-end" | "document-idle"
   * @returns
   */
  private async runMatchedUserScripts(url: string, ctx: IExecutionContext) {
    try {
      if (!url) return;
      const scripts = await userScriptController.getScriptsForURL(url);
      for (const script of scripts) {
        const meta = parseUserScriptMetadata(script.source);
        if (meta?.noframes) {
          const codeToInject = `
              if (window === window.top) {
                (function() {
                const id = "__userscript_injected_${script.id}";
                  if (typeof window !== 'undefined' && !window[id]) {
                    window[id] = true;
                    try { ${script.source} } catch (e) { console.error("UserScript error [${script.name}]:", e); }
                  }
                })();
              }
            `;
          ctx.webContents.executeJavaScript(codeToInject, true).catch(() => {});
        } else {
          const codeToInject = `
              (function() {
                const id = "__userscript_injected_${script.id}";
                if (typeof window !== 'undefined' && !window[id]) {
                  window[id] = true;
                  try { ${script.source} } catch (e) { console.error("UserScript error [${script.name}]:", e); }
                }
              })();
            `;
          ctx.webContents.executeJavaScript(codeToInject, true).catch(() => {});
        }
      }
    } catch (error) {
      console.error("runMatchedUserScripts error", error);
    }
  }
}
