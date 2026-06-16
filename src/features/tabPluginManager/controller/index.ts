import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { Tab } from "../../tabs/models/tab";

export class TabPluginManager {
  private plugins: ITabPlugin[] = [];
  isAttached: boolean = false;
  eventCaching: Map<string, Record<string, Array<() => void>>> = new Map();

  register(plugin: ITabPlugin) {
    this.plugins.push(plugin);
  }
  unregister(tabId: string) {
    const uns = this.eventCaching.get(tabId);
    if (uns) {
      Object.keys(uns).forEach((key) => uns[key]?.forEach((fn) => fn()));
      this.eventCaching.delete(tabId);
    }
    this.plugins = [];
    this.isAttached = false;
  }

  attachTo(tab: Tab) {
    if (this.isAttached) return;
    const ctx = this.buildContext(tab);
    for (const plugin of this.plugins) {
      const hooks: ITabLifecycleHooks = {};
      plugin.register(hooks, ctx);
      this.wire(tab, hooks, ctx);
    }
    this.isAttached = true;
  }

  saveUnsubscribe(tabId: string, name: string, callback: () => void) {
    const unsubs = this.eventCaching.get(tabId) || {};
    (unsubs[name] ??= []).push(callback);
    this.eventCaching.set(tabId, unsubs);
  }

  private wire(tab: Tab, hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    const wc = tab.webContents;

    if (hooks.onDidStopLoad) {
      const callback = () => hooks.onDidStopLoad!(ctx);
      wc.on("did-stop-loading", callback);
      this.saveUnsubscribe(tab.id, "did-stop-loading", () => wc.off("did-stop-loading", callback));
    }
    if (hooks.onWillNavigate) {
      const callback = () => hooks.onWillNavigate!(ctx);
      wc.on("will-navigate", callback);
      wc.on("will-redirect", callback);
      this.saveUnsubscribe(tab.id, "will-navigate", () => wc.off("will-navigate", callback));
      this.saveUnsubscribe(tab.id, "will-redirect", () => wc.off("will-redirect", callback));
    }
    if (hooks.onConsoleMessage) {
      const callback = (_e: any, _lvl: any, msg: any) => hooks.onConsoleMessage!(ctx, msg);
      wc.on("console-message", callback);
      this.saveUnsubscribe(tab.id, "console-message", () => wc.off("console-message", callback));
    }
    if (hooks.onDidNavigate) {
      const callback = () => hooks.onDidNavigate!(ctx);
      wc.on("did-navigate", callback);
      this.saveUnsubscribe(tab.id, "did-navigate", () => wc.off("did-navigate", callback));
    }
    if (hooks.onFoundInPage) {
      const callback = (_event: any, result: any) => hooks.onFoundInPage!(ctx, result);
      wc.on("found-in-page", callback);
      this.saveUnsubscribe(tab.id, "found-in-page", () => wc.off("found-in-page", callback));
    }

    if (hooks.onDestroy) {
      this.saveUnsubscribe(tab.id, `destroy:${ctx.tabId}`, () => hooks.onDestroy!(ctx));
    }
  }

  private buildContext(tab: Tab): IExecutionContext {
    return {
      tabId: tab.id,
      webContents: tab.webContents,
      get url() {
        return tab.url;
      },
      getBounds: () => tab.view.getBounds(),
    };
  }
}
