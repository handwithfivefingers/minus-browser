import { BrowserWindow, dialog } from "electron";
import path from "node:path";

export async function handleDownload(
  event: Electron.IpcMainEvent,
  requestId: string,
  args: any[],
): Promise<void> {
  const options = args[0] || {};
  const { url, name, headers, saveAs, conflictAction = "uniquify" } = options;

  if (!url) {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: false,
      error: "Download URL is required",
    });
    return;
  }

  const win = BrowserWindow.getFocusedWindow();
  if (!win) {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: false,
      error: "No focused window",
    });
    return;
  }

  try {
    let downloadPath: string | undefined;

    if (saveAs) {
      const result = await dialog.showSaveDialog(win, {
        defaultPath: name || path.basename(url),
      });
      if (result.canceled) {
        event.sender.send("GM:RESPONSE", {
          requestId,
          success: false,
          error: "Canceled by user",
        });
        return;
      }
      downloadPath = result.filePath;
    }

    win.webContents.session.once("will-download", (_event, item) => {
      if (name) (item as any).setFilename(name);
      if (downloadPath) item.setSavePath(downloadPath);

      item.on("done", (_event, state) => {
        if (state === "completed") {
          event.sender.send("GM:RESPONSE", {
            requestId,
            success: true,
            data: { filename: item.getFilename(), path: item.getSavePath() },
          });
        } else {
          event.sender.send("GM:RESPONSE", {
            requestId,
            success: false,
            error: `Download ${state}`,
          });
        }
      });

      item.on("updated", (_event, state) => {
        if (state === "progressing") {
          event.sender.send("GM:PROGRESS", {
            requestId,
            type: "progress",
            data: {
              loaded: item.getReceivedBytes(),
              total: item.getTotalBytes(),
            },
          });
        }
      });
    });

    win.webContents.downloadURL(url);
  } catch (error: any) {
    event.sender.send("GM:RESPONSE", {
      requestId,
      success: false,
      error: error.message || String(error),
    });
  }
}
