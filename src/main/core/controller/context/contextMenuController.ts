import { BrowserWindow, clipboard, Menu, MenuItem } from "electron";

export class ContextMenuController {
  template: any[] | undefined;
  initialize(event: Electron.Event, params: Electron.ContextMenuParams) {
    const template: Partial<MenuItem>[] = [
      { label: "Cut", role: "cut" },
      { label: "Copy", role: "copy" },
    ];
    if (params.isEditable) {
      template.push({ label: "Paste", role: "paste" });
    }
    if (params.selectionText?.trim()) {
      template.push({
        label: "Translate Selection",
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          window?.webContents?.send("TRANSLATE_SELECTION_AVAILABLE", {
            text: params.selectionText.trim(),
          });
        },
      });
    }

    template.push({ type: "separator" });

    template.push(
      {
        label: "Capture Page",
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          window?.webContents?.send("CAPTURE_PAGE", {});
        },
      },
      {
        label: "Capture Selection",
        click: () => {
          const window = BrowserWindow.getFocusedWindow();
          window?.webContents?.send("CAPTURE_SELECTION", {});
        },
      },
    );

    template.push({ type: "separator" });

    if (params.mediaType === "image") {
      template.unshift({
        label: "Save Image As...",
        click: () => {
          return clipboard.writeText(params.srcURL);
        },
      });
    }
    if (params.linkURL) {
      template.unshift(
        {
          label: "Open Link in New Window",
          click: () => {
            const window = BrowserWindow.getFocusedWindow();
            window?.webContents?.send("CREATE_TAB", { url: params.linkURL });
          },
        },
        {
          label: "Copy Link Address",
          click: () => {
            return clipboard.writeText(params.linkURL);
          },
        },
      );
    }

    const menu = Menu.buildFromTemplate(template as any);
    menu.popup({ window: BrowserWindow.getFocusedWindow() as BrowserWindow });
  }
}
