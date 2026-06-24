import { BrowserWindow, MenuItem } from "electron";
import { findbarService } from "~/features/findbar/service";
import { ViewController } from "~/core/controller/viewController";
import { subWindowService } from "~/features/sub-window/service";

export class CommandController {
  viewController: ViewController;
  constructor(viewController: ViewController) {
    this.viewController = viewController;
  }

  get menuItems(): MenuItem[] {
    return [
      new MenuItem({
        label: "History",
        accelerator: "CmdOrCtrl+Y",
        click: () => this.onOpenHistory(),
      }),
      new MenuItem({
        label: "Search",
        accelerator: "CommandOrControl+F",
        click: () => findbarService.toggle(),
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

  onOpenHistory() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("NAVIGATE_HISTORY");
  }

  onCreateTabCallback() {
    this.viewController.createTab();
  }
  onToggleDevTools() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("TOGGLE_DEV_TOOLS");
  }

  onOpenSpotlight() {
    if (subWindowService.isOpen) {
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
