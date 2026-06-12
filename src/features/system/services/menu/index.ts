import { Menu, MenuItem, app } from "electron";

const isMac = process.platform === "darwin";
// [isMac ? new MenuItem({ role: "close" }) : new MenuItem({ role: "quit" })]
const template = [
  {
    label: "Edit",
    submenu: [{ role: "undo" }, { role: "redo" }, { role: "cut" }, { role: "copy" }, { role: "paste" }],
  },
  {
    label: "View",
    submenu: [{ role: "reload" }, { role: "toggleDevTools" }, { type: "separator" }, { role: "togglefullscreen" }],
  },
];
class MenuApplication {
  items: MenuItem[] = [];
  menu: Menu | undefined;

  constructor() {
    this.menu = Menu.buildFromTemplate([
      new MenuItem({
        role: "appMenu",
      }),
      new MenuItem({
        role: "editMenu",
        submenu: Menu.buildFromTemplate([
          new MenuItem({ role: "undo" }),
          new MenuItem({ role: "redo" }),
          new MenuItem({ type: "separator" }),
          new MenuItem({ role: "cut" }),
          new MenuItem({ role: "copy" }),
          new MenuItem({ role: "paste" }),
          new MenuItem({ role: "selectAll" }),
        ]),
      }),
      new MenuItem({
        role: "windowMenu",
      }),
    ]);
  }
}

export const menuApplication = new MenuApplication();
