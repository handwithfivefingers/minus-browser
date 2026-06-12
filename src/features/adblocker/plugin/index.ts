import { WebContents } from "electron";
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { AdBlocker } from "../controllers";
// import { CAPTURE_CREDENTIAL_SCRIPT, CREDENTIAL_ASSIST_SCRIPT } from "../constants";
// import { VaultController } from "../controllers";
// import { VaultServices } from "../services";
// import { ipcMain } from "electron";
// import { IPC } from "~/features/system";
const blocker = new AdBlocker();

export class AdblockTabPlugin implements ITabPlugin {
  readonly name = "adblocker";
  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer;
    blocker.initialize();
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    blocker.setupAdvancedRequestBlocking(ctx.webContents.session);
    hooks.onDidNavigate = () => {
      if (ctx.webContents.getURL().includes("youtube.com")) {
        blocker.injectYoutubeAdblockSponsor(ctx.webContents as WebContents);
      }
    };
  }
  disabled(ctx: IExecutionContext) {
    blocker.disabled(ctx.webContents.session);
  }
}
