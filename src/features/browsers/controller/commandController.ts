import { BrowserWindow, globalShortcut } from "electron";
import log from "electron-log";

class CommandShortCut {
  isActive: boolean = false;
  commandName: string = "";
  callback: () => void;
  constructor({ commandName, callback }: { commandName: string; callback: () => void }) {
    this.commandName = commandName;
    this.callback = callback;
    this.initialize();
  }

  initialize() {
    log.info("CommandShortCut initialized");
    let isRegistered = globalShortcut.isRegistered(this.commandName);
    if (!isRegistered) {
      globalShortcut.register(this.commandName, this.callback);
    }
  }

  destroy() {
    globalShortcut.unregister(this.commandName);
    this.isActive = false;
  }
}

export class CommandController {
  isSearch = false;
  search: CommandShortCut;
  createTab: CommandShortCut;
  toggleDevTools: CommandShortCut;
  reloadPage: CommandShortCut;

  constructor() {
    this.initialize();
  }

  initialize() {
    log.info("CommandController initialized");
    this.search = new CommandShortCut({
      commandName: "CommandOrControl+F",
      callback: () => this.onSearchCallback(),
    });

    this.createTab = new CommandShortCut({
      commandName: "CommandOrControl+T",
      callback: () => this.onCreateTabCallback(),
    });
    this.toggleDevTools = new CommandShortCut({
      commandName: "F12",
      callback: () => this.onToggleDevTools(),
    });
    this.reloadPage = new CommandShortCut({
      commandName: "CommandOrControl+R",
      callback: () => this.onReloadPage(),
    });
  }

  onSearchCallback() {
    this.isSearch = !this.isSearch;
    let view = BrowserWindow.getFocusedWindow();
    view.webContents.send("SEARCH", { open: this.isSearch });
  }

  onCreateTabCallback() {
    let view = BrowserWindow.getFocusedWindow();
    view.webContents.send("CREATE_TAB");
  }
  onToggleDevTools() {
    let view = BrowserWindow.getFocusedWindow();
    view.webContents.send("TOGGLE_DEV_TOOLS");
  }
  onReloadPage() {
    let view = BrowserWindow.getFocusedWindow();
    view.webContents.send("ON_RELOAD");
  }
  destroy() {
    this.search.destroy();
    this.createTab.destroy();
  }
}
