import Logger from "electron-log";
import process from "node:process";
export class LogController {
  constructor() {
    Logger.log("LogController initialized");
  }

  init() {
    process.on("uncaughtException", function (err) {
      Logger.error(err);
    });
  }
}
