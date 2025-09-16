import { app } from "electron";
import log from "electron-log";
import fs from "node:fs";
import path from "node:path";

const filesPath = {
  development: {
    userData: path.join("appData", "userData.json"),
    interface: path.join("appData", "interface.json"),
    session: path.join("appData", "session.json"),
    bookmark: path.join("appData", "bookmark.json"),
    history: path.join("appData", "history.json"),
  },
  production: {
    userData: path.join(app.getPath("userData"), "userData.json"),
    interface: path.join(app.getPath("userData"), "interface.json"),
    session: path.join(app.getPath("userData"), "session.json"),
    bookmark: path.join(app.getPath("userData"), "bookmark.json"),
    history: path.join(app.getPath("userData"), "history.json"),
  },
};

type StoreName = "userData" | "interface" | "session" | "bookmark" | "history";
const pathConfig = process.env.NODE_ENV === "development" ? filesPath.development : filesPath.production;
export class StoreManager {
  storage = new Map();
  configFile = pathConfig.userData;
  constructor(props: StoreName = "userData") {
    if (!["userData", "interface", "session", "bookmark", "history"].includes(props)) {
      throw new Error("Invalid props");
    }
    this.configFile = pathConfig[props];
    this.initialize(props);
  }
  initialize(fileName: StoreName) {
    const isExist = fs.existsSync(pathConfig[fileName]);
    if (!isExist) {
      fs.writeFileSync(pathConfig[fileName], "");
    }
  }

  readFiles = <T>(): Promise<T> => {
    return new Promise((resolve, reject) => {
      log.info("readFiles > ", this.configFile);
      return fs.readFile(this.configFile, "utf-8", (error, data) => {
        if (data) return resolve(JSON.parse(data));
        reject(error);
      });
    });
  };
  saveFiles: <T>(data: T) => void = (data) => {
    return new Promise((resolve, reject) => {
      log.info("saveFiles > ", this.configFile);
      const tmp = this.configFile.replace(/\.json$/, "-temp.json");
      fs.writeFile(tmp, JSON.stringify(data), (error) => {
        if (error) return reject(error);
        fs.rename(tmp, this.configFile, (error) => {
          if (error) return reject(error);
          resolve(true);
        });
      });
    });
  };
}
