import { WebContentsView } from "electron";
import path from "node:path";
export class Sidebar {
  view: WebContentsView;
  constructor() {}

  initialize() {
    const view = new WebContentsView({
      webPreferences: {
        preload: path.resolve(__dirname, "preload.js"),
      },
    });
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      /**@ts-ignore */
      view.webContents.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      /**@ts-ignore */
      view.webContents.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    view.setBounds({ x: 500, y: 0, width: 55, height: 859 });
    this.view = view;
  }
}
