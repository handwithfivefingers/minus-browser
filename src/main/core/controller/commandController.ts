import { BrowserWindow, MenuItem } from "electron";
import { findbarService } from "~/features/findbar/service";
import { ViewController } from "~/main/core/controller/viewController";
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
        label: "AI Sidebar",
        accelerator: "CommandOrControl+Shift+K",
        click: () => this.onToggleAiSidebar(),
      }),
      new MenuItem({
        label: "Settings",
        accelerator: "CommandOrControl+,",
        click: () => this.onOpenSettings(),
      }),
      new MenuItem({
        label: "Toggle DevTools",
        accelerator: "F12",
        click: () => this.onToggleDevTools(),
      }),
      new MenuItem({
        label: "Toggle DevTools (Alternative)",
        accelerator: "CommandOrControl+Alt+I",
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

  onToggleAiSidebar() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("TOGGLE_AI_SIDEBAR");
  }

  onOpenSettings() {
    let view = BrowserWindow.getFocusedWindow();
    view?.webContents?.send("NAVIGATE_SETTINGS");
  }

  onCreateTabCallback() {
    this.viewController.createTab();
  }
  onToggleDevTools() {
    // let view = BrowserWindow.getFocusedWindow();
    // view?.webContents?.send("TOGGLE_DEV_TOOLS");
    const view = this.viewController?.tabController?.activeTab;
    if (view) {
      view.webContents.openDevTools();
    }
  }

  onOpenSpotlight() {
    if (subWindowService.isOpen) {
      this.viewController.closeSpotlight();
    } else {
      this.viewController.openSpotlight();
    }
  }

  onReloadPage() {
    const view = this.viewController?.tabController?.activeTab;
    if (view) {
      view.webContents.reload();
    }
  }
}
