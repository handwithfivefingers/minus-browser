import { BrowserWindow, globalShortcut } from "electron";
import log from "electron-log";
export class CommandController {
  isRegisterSearch = false;
  isRegisterReload = false;
  isSearch = false;
  window: BrowserWindow;
  constructor() {
    this.initialize();
  }

  initialize() {
    log.info("CommandController initialized");
    let isRegistered = globalShortcut.isRegistered("CommandOrControl+F");
    if (!isRegistered) {
      globalShortcut.register("CommandOrControl+F", () => {
        log.info("CommandOrControl+F");
        let view = BrowserWindow.getFocusedWindow();
        this.isSearch = !this.isSearch;
        if (this.isSearch) {
          view.contentView.setVisible(false);
        } else {
          view.contentView.setVisible(true);
        }
        view.webContents.send("SEARCH", { open: this.isSearch }); // MAIN View
      });
    }
  }

  destroy() {
    globalShortcut.unregister("CommandOrControl+F");
  }
}
