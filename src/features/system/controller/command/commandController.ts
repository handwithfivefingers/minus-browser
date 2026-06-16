import { BrowserWindow, MenuItem, WebContentsView } from "electron";
import Findbar from "electron-findbar";
import { eventStore } from "~/features/system/stores/minusEventEmitter";
import { ViewController } from "..";

export class CommandController {
  isSearch = false;
  viewController: ViewController;
  activeTab: WebContentsView | null = null;
  constructor(viewController: ViewController) {
    this.viewController = viewController;
    // eventStore.listen("searchBarClosed", () => {
    //   this.isSearch = false;
    // });
    eventStore.listen("viewChanges", (view: WebContentsView) => {
      this.activeTab = view;
    });
  }

  get menuItems(): MenuItem[] {
    return [
      new MenuItem({
        label: "Search",
        accelerator: "CommandOrControl+F",
        click: () => this.onSearchCallback(),
      }),
      new MenuItem({
        label: "New Tab",
        accelerator: "CommandOrControl+T",
        click: () => this.onCreateTabCallback(),
      }),
      new MenuItem({
        label: "Spotlight",
        accelerator: "CommandOrControl+K",
        click: () => this.onOpenSpotlight(),
      }),
      new MenuItem({
        label: "Toggle DevTools",
        accelerator: "F12",
        click: () => this.onToggleDevTools(),
      }),
      new MenuItem({
        label: "Reload",
        accelerator: "CommandOrControl+R",
        click: () => this.onReloadPage(),
      }),
    ];
  }

  onSearchCallback() {
    console.log("Search callback");
    this.isSearch = !this.isSearch;
    console.log("Findbar", Findbar);
    const searchProcess = (bar: ReturnType<typeof Findbar.from>) => {
      bar.setBoundsHandler((parentBounds, findbarBounds) => {
        return {
          x: parentBounds.x + parentBounds.width - findbarBounds.width - 20,
          y: parentBounds.y + findbarBounds.height,
        };
      });

      if (this.isSearch) bar.open();
      else bar.close();
    };
    if (!this.activeTab) return;
    let findBar;
    try {
      findBar = Findbar.fromIfExists(this.activeTab?.webContents);
      searchProcess(findBar);
    } catch (error) {
      findBar = Findbar.from(this.activeTab?.webContents);
      searchProcess(findBar);
    }
    if (!findBar) return;
  }

  onCreateTabCallback() {
    this.viewController.createTab();
  }
  onToggleDevTools() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("TOGGLE_DEV_TOOLS");
  }

  onOpenSpotlight() {
    if (this.viewController.spotlightController.isOpen) {
      this.viewController.closeSpotlight();
    } else {
      this.viewController.openSpotlight();
    }
  }

  onReloadPage() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("ON_RELOAD");
  }
}
