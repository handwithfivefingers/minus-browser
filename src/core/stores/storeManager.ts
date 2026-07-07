import { app } from "electron";
import log from "electron-log";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

const devDataDir = path.resolve(process.cwd(), "appData");
const resolveUserDataDir = () => {
  try {
    return app.getPath("userData");
  } catch {
    return devDataDir;
  }
};
const baseDir = process.env.NODE_ENV === "development" ? devDataDir : resolveUserDataDir();

const fileStorages = {
  userData: path.join(baseDir, "userData.json"),
  interface: path.join(baseDir, "interface.json"),
  session: path.join(baseDir, "session.json"),
  bookmark: path.join(baseDir, "bookmark.json"),
  history: path.join(baseDir, "history.json"),
  userscripts: path.join(baseDir, "userscripts.json"),
  passwordVault: path.join(baseDir, "passwordVault.json"),
  translate: path.join(baseDir, "translate.json"),
  permission: path.join(baseDir, "permission.json"),
};

type StoreName =
  | "userData"
  | "interface"
  | "session"
  | "bookmark"
  | "history"
  | "userscripts"
  | "passwordVault"
  | "translate"
  | "permission";
export class StoreManager {
  storage = new Map();
  configFile = fileStorages.userData;
  constructor(props: StoreName = "userData") {
    if (
      ![
        "userData",
        "interface",
        "session",
        "bookmark",
        "history",
        "userscripts",
        "passwordVault",
        "translate",
        "permission",
      ].includes(props)
    ) {
      throw new Error("Invalid props");
    }
    this.configFile = fileStorages[props];
  }

  async ensureFile() {
    try {
      const dir = path.dirname(this.configFile);
      await fsp.mkdir(dir, { recursive: true });
      await fsp.access(this.configFile);
    } catch {
      await fsp.writeFile(this.configFile, JSON.stringify([]), "utf-8");
    }
  }

  readFiles = <T>(fallback = {} as T): Promise<T> => {
    return new Promise(async (resolve, reject) => {
      await this.ensureFile();
      fs.readFile(this.configFile, "utf-8", (error, data) => {
        if (error) {
          log.error("Lỗi hệ thống khi đọc file:", error);
          return reject(error);
        }

        if (!data || data.trim() === "") {
          log.error("File trống, trả về object rỗng");
          return resolve(fallback as T);
        }

        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (parseError) {
          log.error("Lỗi định dạng JSON không hợp lệ:", parseError);
          resolve(fallback as T);
        }
      });
    });
  };

  saveFiles: <T>(data: T) => void = async (data) => {
    await fsp.mkdir(path.dirname(this.configFile), { recursive: true });
    const tmp = this.configFile.replace(/\.json$/, "-temp.json");
    await fsp.writeFile(tmp, JSON.stringify(data));
    await fsp.rename(tmp, this.configFile);
  };
}
