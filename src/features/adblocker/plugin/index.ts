import { WebContents } from "electron";
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { AdBlocker } from "../controllers";

const blocker = new AdBlocker();

export class AdblockTabPlugin implements ITabPlugin {
  readonly name = "adblocker";
  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer;
    blocker.initialize();
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    blocker.setupAdvancedRequestBlocking(ctx.webContents.session);

    const wc = ctx.webContents as WebContents;

    const onDidFinishLoad = () => {
      const url = ctx.webContents.getURL();
      if (!url || url === "about:blank") return;
      blocker.injectCosmeticFilters(wc, url);
    };

    wc.on("did-finish-load", onDidFinishLoad);

    hooks.onDidNavigate = () => {
      const url = ctx.webContents.getURL();
      if (url.includes("youtube.com")) {
        blocker.injectYoutubeAdblockSponsor(wc);
      }
    };

    hooks.onDestroy = () => {
      wc.off("did-finish-load", onDidFinishLoad);
    };
  }

  disabled(ctx: IExecutionContext) {
    blocker.disabled(ctx.webContents.session);
  }
}
