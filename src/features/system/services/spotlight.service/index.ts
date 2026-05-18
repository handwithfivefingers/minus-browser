import { BrowserWindow, WebContentsView } from "electron";

export class SpotlightService {
  isOpen = false;
  isRegister = false;
  view: WebContentsView | null = null;

  registerView() {
    this.isRegister = true;
    this.view = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enablePreferredSizeMode: true,
        backgroundThrottling: true,
      },
    });
  }
  openSpotlight() {
    if (!this.isRegister) this.registerView();
    if (this.isOpen) return;
    this.isOpen = true;
    const browser = BrowserWindow.getFocusedWindow();
    if (browser && this.view) {
      this.view?.setBounds(browser.getBounds());
      this.view?.setBackgroundColor("#00000000");
      this.view?.webContents.openDevTools();
      browser.contentView.addChildView(this.view);

      let targetURL;

      /**@ts-ignore */
      if (SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL) {
        /**@ts-ignore */
        targetURL = SPOTLIGHT_WINDOW_VITE_DEV_SERVER_URL;
      } else {
        /**@ts-ignore */
        targetURL = path.join(__dirname, `../renderer/${SPOTLIGHT_WINDOW_VITE_NAME}/index.html`);
      }

      this.view?.webContents
        .loadURL(targetURL)
        .then(() => {
          this.isOpen = true;
        })
        .catch((e) => {
          console.log("e", e);
        });
    }
  }
  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const browser = BrowserWindow.getFocusedWindow();
    if (browser && this.view) {
      browser.contentView.removeChildView(this.view);
    }
    this.view = null;
    this.isRegister = false;
  }
}
