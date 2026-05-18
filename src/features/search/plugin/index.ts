import { BrowserWindow, WebContentsView } from "electron";
import { IExecutionContext, ITabLifecycleHooks, ITabPlugin } from "~/shared/types";
import { SearchService } from "../services";

export class SearchTabPlugin implements ITabPlugin {
  readonly name = "search";
  private searchBarVisible = false;
  private service = new SearchService();

  constructor(private emitToRenderer: (channel: string, data: any) => void) {
    this.emitToRenderer = emitToRenderer;
  }

  register(hooks: ITabLifecycleHooks, ctx: IExecutionContext) {
    hooks.onConsoleMessage = (_ctx, message) => this.handleConsoleMessage(ctx, message);
    hooks.onDidNavigate = () => this.hideSearchBar(ctx);
    hooks.onFoundInPage = (_ctx, result) => this.handleFoundInPage(ctx, result);
  }

  private async handleConsoleMessage(ctx: IExecutionContext, message: string) {
    if (message === "__MINUS_SEARCH_CLOSE__") {
      await this.hideSearchBar(ctx);
      const browser = BrowserWindow.getFocusedWindow();
      browser?.webContents?.send(`SEARCH_BAR_CLOSED:${ctx.tabId}`);
      return;
    }

    if (!message.startsWith("__MINUS_SEARCH__:")) return;
    try {
      const payload = JSON.parse(message.slice("__MINUS_SEARCH__:".length)) as {
        query: string;
        findNext: boolean;
        forward: boolean;
      };
      const { query, findNext, forward } = payload;
      this.searchBarVisible = true;

      if (!query?.trim()) {
        ctx.webContents.stopFindInPage("clearSelection");
        await this.service.updateSearchCount(ctx.webContents as Electron.WebContents, 0, 0);
        return;
      }

      ctx.webContents.findInPage(query, { forward, findNext, matchCase: false });
    } catch {
      // ignore malformed console payloads
    }
  }

  private async handleFoundInPage(ctx: IExecutionContext, result: any) {
    if (!this.searchBarVisible || !result?.finalUpdate) return;
    await this.service.updateSearchCount(
      ctx.webContents as Electron.WebContents,
      result.activeMatchOrdinal ?? 0,
      result.matches ?? 0,
    );
    this.emitToRenderer(`FOUND_IN_PAGE:${ctx.tabId}`, {
      activeMatchOrdinal: result.activeMatchOrdinal,
      matches: result.matches,
    });
  }

  private async hideSearchBar(ctx: IExecutionContext) {
    if (!this.searchBarVisible) return;
    this.searchBarVisible = false;
    await this.service.hideSearchBar({ webContents: ctx.webContents } as WebContentsView);
  }
}
