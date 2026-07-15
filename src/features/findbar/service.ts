import { app, BrowserWindow, ipcMain, IpcMainEvent, WebContentsView } from "electron";
import * as fs from "node:fs";
import path from "node:path";
import { searchController } from "~/features/search/controllers/index.js";
import { eventStore } from "~/main/core/stores/index.js";
import { FINDBAR_HTML } from "./index.js";

export class FindbarService {
  private mainWindow: BrowserWindow | null = null;
  private findbarView: WebContentsView | null = null;
  private activeView: WebContentsView | null = null;
  private matchCase = false;
  private htmlPath: string | null = null;
  private lastText = "";
  private resizeHandler: (() => void) | null = null;

  private onTextChange = (_event: IpcMainEvent, { text }: { text: string }) => {
    this.lastText = text;
    if (!text.trim()) {
      this.stopFind();
      this.sendMatches(0, 0);
      return;
    }
    searchController.searchPage({
      query: text,
      forward: true,
      findNext: false,
      matchCase: this.matchCase,
    });
  };

  private onFindNext = () => {
    if (!this.lastText) return;
    searchController.searchPage({
      query: this.lastText,
      forward: true,
      findNext: true,
      matchCase: this.matchCase,
    });
  };

  private onFindPrevious = () => {
    if (!this.lastText) return;
    searchController.searchPage({
      query: this.lastText,
      forward: false,
      findNext: true,
      matchCase: this.matchCase,
    });
  };

  private onCloseFindbar = () => {
    this.close();
  };

  private onMatchCase = (_event: IpcMainEvent, { value }: { value: boolean }) => {
    this.matchCase = value;
  };

  private onFoundInPage = (_event: Electron.Event, result: Electron.FoundInPageResult) => {
    if (!result.finalUpdate) return;
    this.sendMatches(result.activeMatchOrdinal, result.matches);
  };

  init(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.htmlPath = path.join(app.getPath("userData"), "findbar.html");

    try {
      fs.writeFileSync(this.htmlPath, FINDBAR_HTML, "utf-8");
    } catch (e) {
      console.error("[ERROR] Failed to write findbar.html:", e);
    }

    eventStore.listen("viewChanges", (view: WebContentsView | undefined) => {
      if (this.activeView && this.findbarView) {
        this.activeView.webContents.removeListener("found-in-page", this.onFoundInPage);
      }
      this.activeView = view || null;
      if (this.activeView && this.findbarView) {
        this.activeView.webContents.on("found-in-page", this.onFoundInPage);
      }
    });

    ipcMain.on("findbar:text-change", this.onTextChange);
    ipcMain.on("findbar:find-next", this.onFindNext);
    ipcMain.on("findbar:find-previous", this.onFindPrevious);
    ipcMain.on("findbar:close", this.onCloseFindbar);
    ipcMain.on("findbar:match-case", this.onMatchCase);
  }

  destroy() {
    this.close();
    ipcMain.removeListener("findbar:text-change", this.onTextChange);
    ipcMain.removeListener("findbar:find-next", this.onFindNext);
    ipcMain.removeListener("findbar:find-previous", this.onFindPrevious);
    ipcMain.removeListener("findbar:close", this.onCloseFindbar);
    ipcMain.removeListener("findbar:match-case", this.onMatchCase);
  }

  toggle() {
    if (this.findbarView) {
      this.close();
    } else {
      this.open();
    }
  }

  private open() {
    if (!this.mainWindow || !this.activeView || !this.htmlPath) return;

    this.findbarView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "findbar-preload.js"),
        backgroundThrottling: false,
      },
    });

    this.syncViewBounds();
    this.mainWindow.contentView.addChildView(this.findbarView);

    this.findbarView.webContents.loadFile(this.htmlPath);

    this.findbarView.webContents.on("did-finish-load", () => {
      if (!this.findbarView) return;
      if (this.activeView) {
        this.activeView.webContents.on("found-in-page", this.onFoundInPage);
      }
      this.findbarView.webContents.focus();
      this.focusInput();
    });

    this.findbarView.webContents.on("destroyed", () => {
      if (this.activeView) {
        this.activeView.webContents.removeListener("found-in-page", this.onFoundInPage);
      }
      this.stopFind();
      this.findbarView = null;
    });

    this.resizeHandler = () => this.syncViewBounds();
    this.mainWindow.on("resize", this.resizeHandler);
  }

  close() {
    if (!this.findbarView || !this.mainWindow) return;

    if (this.activeView) {
      this.activeView.webContents.removeListener("found-in-page", this.onFoundInPage);
    }

    if (this.resizeHandler) {
      this.mainWindow.off("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    this.stopFind();
    try {
      this.mainWindow.contentView.removeChildView(this.findbarView);
    } catch {}
    this.findbarView.webContents.close();
    this.findbarView = null;
  }

  private syncViewBounds = () => {
    if (!this.mainWindow || !this.findbarView) return;
    const { width } = this.mainWindow.getBounds();
    this.findbarView.setBounds({
      x: width - 368,
      y: 0,
      width: 368,
      height: 42,
    });
  };

  private focusInput() {
    if (!this.findbarView) return;
    this.findbarView.webContents.send("findbar:focus-input");
  }

  private sendMatches(active: number, total: number) {
    if (!this.findbarView) return;
    this.findbarView.webContents.send("findbar:matches", { active, total });
  }

  private stopFind() {
    this.lastText = "";
    if (this.activeView) {
      this.activeView.webContents.stopFindInPage("clearSelection");
    }
  }
}

export const findbarService = new FindbarService();
