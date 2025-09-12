import { BrowserWindow, clipboard, Menu, MenuItem, WebContentsView } from "electron";

interface IContextTemplate {
  label?: string;
  role?: string;
  click?: () => void;
  type?: string;
}
export class ContextMenuController {
  template: any[];

  initialize(event: Electron.Event, params: Electron.ContextMenuParams) {
    console.log("params", params);
    const template: Partial<MenuItem>[] = [
      { label: "Cut", role: "cut" },
      { label: "Copy", role: "copy" },
    ];
    if (params.isEditable) {
      template.push({ label: "Paste", role: "paste" });
    }

    template.push({ type: "separator" });

    if (params.mediaType === "image") {
      template.unshift({
        label: "Save Image As...",
        click: () => {
          // Implement save image logic
          return clipboard.writeText(params.srcURL);
        },
      });
    } else if (params.linkURL) {
      template.unshift(
        {
          label: "Open Link in New Window",
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            window.webContents.send("CREATE_TAB", { url: params.linkURL });
          },
        },
        {
          label: "Copy Link Address",
          click: () => {
            return clipboard.writeText(params.linkURL);
          },
        }
      );
    }

    const menu = Menu.buildFromTemplate(template as any);
    menu.popup({ window: BrowserWindow.getFocusedWindow() });
  }
}
