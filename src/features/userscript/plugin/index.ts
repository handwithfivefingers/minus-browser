import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { userScriptController } from "../controllers";

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
        try {
          const codeToInject = `
            (function() {
              const id = "__" + ${JSON.stringify(script.id)};
              if (typeof window !== 'undefined' && !window[id]) {
                window[id] = true;
                try {
                  ${script.source}
                } catch (e) {
                  console.error("Injected script error:", e);
                }
              }
            })();
          `;
          ctx.webContents.executeJavaScript(codeToInject, true).catch((err) => console.error("Execution failed:", err));
          // console.log(`[UserScript:${script.name}] executed (runAt=${runAt}) on ${url}`);
        } catch (error) {
          console.error(`[UserScript:${script.name}] execution failed`, error);
        }
      }
    } catch (error) {
      console.error("runMatchedUserScripts error", error);
    }
  }
}
