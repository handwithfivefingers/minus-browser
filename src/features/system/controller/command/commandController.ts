import { BrowserWindow, globalShortcut } from "electron";
import { ViewController } from "..";
import { SpotlightService } from "../../services/spotlight.service";
import { searchController } from "~/features/search";

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
    // log.info("CommandShortCut initialized");
    let isRegistered = globalShortcut.isRegistered(this.commandName);
    if (!isRegistered) {
      globalShortcut.register(this.commandName, this.callback);
    }
  }

  destroy() {
    globalShortcut.unregister(this.commandName);
    this.isActive = false;
    // console.log(`Command ${this.commandName} deleted`);
  }
}

export class CommandController {
  isSearch = false;
  search: CommandShortCut | undefined;
  createTab: CommandShortCut | undefined;
  toggleDevTools: CommandShortCut | undefined;
  reloadPage: CommandShortCut | undefined;
  spotlight: CommandShortCut | undefined;
  viewController: ViewController;

  spotlightService: SpotlightService = new SpotlightService();
  constructor(viewController: ViewController) {
    this.viewController = viewController;
    this.initialize();
  }

  initialize() {
    // log.info("CommandController initialized");
    this.search = new CommandShortCut({
      commandName: "CommandOrControl+F",
      callback: () => this.onSearchCallback(),
    });
    this.createTab = new CommandShortCut({
      commandName: "CommandOrControl+T",
      callback: () => this.onCreateTabCallback(),
    });
    // this.spotlight = new CommandShortCut({
    //   commandName: "CommandOrControl+K",
    //   callback: () => this.onOpenSpotlight(),
    // });
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
    console.log("Search callback");
    this.isSearch = !this.isSearch;
    // let view = BrowserWindow.getFocusedWindow();
    // view?.webContents?.send("SEARCH", { open: this.isSearch });
    if (this.isSearch) {
      searchController?.showSearchBar();
    } else {
      searchController?.stopSearch();
    }
  }

  onCreateTabCallback() {
    this.viewController.createTab();
  }
  onToggleDevTools() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("TOGGLE_DEV_TOOLS");
  }

  onOpenSpotlight() {
    let win = BrowserWindow.getFocusedWindow();
    // const spotlight = new SpotlightService();
    // spotlight.openSpotlight();
    if (!win) return;
    console.log("this.spotlightService", this.spotlightService);
    if (this.spotlightService.isOpen) {
      this.spotlightService.close();
      return;
    }
    this.spotlightService.openSpotlight();
    console.log("this.spotlightService", this.spotlightService);
  }

  onReloadPage() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("ON_RELOAD");
  }
  destroy() {
    this.search?.destroy();
    this.createTab?.destroy();
    this.toggleDevTools?.destroy();
    this.reloadPage?.destroy();
    // let view = BrowserWindow.getFocusedWindow();
    // this.spotlight?.destroy();
    this.spotlightService.close();
  }
}
