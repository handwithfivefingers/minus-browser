import { autoUpdater } from "electron";
import log from "electron-log";
import { updateElectronApp } from "update-electron-app";
import type { UpdateStatusEvent } from "./types";

type EmitFn = (channel: string, data: unknown) => void;

function statusEvent(data: UpdateStatusEvent): UpdateStatusEvent {
  return data;
}

export function initAutoUpdate(emit: EmitFn) {
  updateElectronApp({
    logger: log,
    notifyUser: false,
  });

  autoUpdater.on("checking-for-update", () => {
    emit("UPDATE_STATUS", statusEvent({ status: "checking" }));
  });

  autoUpdater.on("update-available", () => {
    emit("UPDATE_STATUS", statusEvent({ status: "available" }));
  });

  autoUpdater.on("update-not-available", () => {
    emit("UPDATE_STATUS", statusEvent({ status: "not-available" }));
  });

  autoUpdater.on("error", (err) => {
    emit("UPDATE_STATUS", statusEvent({ status: "error", info: err?.message || String(err) }));
  });

  autoUpdater.on("download-progress", (progress) => {
    emit("UPDATE_STATUS", statusEvent({ status: "downloading", info: progress }));
  });

  autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName, releaseDate, updateURL) => {
    emit(
      "UPDATE_STATUS",
      statusEvent({ status: "downloaded", info: { releaseNotes, releaseName, releaseDate, updateURL } }),
    );
  });
}

export function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

export function quitAndInstall() {
  setImmediate(() => autoUpdater.quitAndInstall());
}
