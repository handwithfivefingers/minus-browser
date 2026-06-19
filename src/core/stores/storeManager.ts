import { app } from "electron";
import log from "electron-log";
import fs from "node:fs";
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
};

type StoreName =
  | "userData"
  | "interface"
  | "session"
  | "bookmark"
  | "history"
  | "userscripts"
  | "passwordVault"
  | "translate";
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
      ].includes(props)
    ) {
      throw new Error("Invalid props");
    }
    this.configFile = fileStorages[props];
    this.initialize(props);
  }
  initialize(fileName: StoreName) {
    try {
      const filePath = fileStorages[fileName];
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const isExist = fs.existsSync(fileStorages[fileName]);
      if (!isExist) {
        fs.writeFileSync(fileStorages[fileName], JSON.stringify([]), "utf-8");
      }
    } catch (error) {
      console.log("[ERROR] StoreManager initialize -", error);
    }
  }

  readFiles = <T>(fallback = {} as T): Promise<T> => {
    return new Promise((resolve, reject) => {
      fs.readFile(this.configFile, "utf-8", (error, data) => {
        if (error) {
          log.error("Lỗi hệ thống khi đọc file:", error);
          return reject(error);
        }

        if (!data || data.trim() === "") {
          log.warn("File trống, trả về object rỗng");
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

  saveFiles: <T>(data: T) => void = (data) => {
    return new Promise((resolve, reject) => {
      fs.mkdirSync(path.dirname(this.configFile), { recursive: true });
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
