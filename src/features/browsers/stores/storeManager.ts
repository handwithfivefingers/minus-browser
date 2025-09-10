import { app } from "electron";
import log from "electron-log";
import fs from "node:fs";
import path from "node:path";
class StoreManager {
  storage = new Map();
  configFile =
    process.env.NODE_ENV === "development" ? "userData.json" : path.join(app.getPath("userData"), "userData.json");
  constructor() {
    log.info("StoreManager initialized with config file:", this.configFile);
    if (!this.isFileConfigExist()) {
      fs.writeFileSync(this.configFile, "");
    }
  }

  isFileConfigExist = () => {
    const result = fs.existsSync(this.configFile);
    return result;
  };

  readFiles = <T>(): Promise<Record<string, T>> => {
    return new Promise((resolve, reject) => {
      fs.readFile(this.configFile, "utf-8", (error, data) => {
        if (data) return resolve(JSON.parse(data));
        reject(error);
      });
    });
  };
  saveFiles: <T>(data: T) => void = (data) => {
    fs.writeFileSync(this.configFile, JSON.stringify(data));
  };

  get = (key: string) => {
    return this.storage.get(key);
  };
  set = <T>(key: string, value: T) => {
    return this.storage.set(key, value);
  };
  delete = <T>(key: string) => {
    return this.storage.delete(key);
  };
}
const storeManager = new StoreManager();
export { storeManager };

