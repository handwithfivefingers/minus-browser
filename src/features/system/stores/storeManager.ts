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

const filesPath = {
  development: {
    userData: path.join(baseDir, "userData.json"),
    interface: path.join(baseDir, "interface.json"),
    session: path.join(baseDir, "session.json"),
    bookmark: path.join(baseDir, "bookmark.json"),
    history: path.join(baseDir, "history.json"),
    userscripts: path.join(baseDir, "userscripts.json"),
    passwordVault: path.join(baseDir, "passwordVault.json"),
    translate: path.join(baseDir, "translate.json"),
  },
  production: {
    userData: path.join(resolveUserDataDir(), "userData.json"),
    interface: path.join(resolveUserDataDir(), "interface.json"),
    session: path.join(resolveUserDataDir(), "session.json"),
    bookmark: path.join(resolveUserDataDir(), "bookmark.json"),
    history: path.join(resolveUserDataDir(), "history.json"),
    userscripts: path.join(resolveUserDataDir(), "userscripts.json"),
    passwordVault: path.join(resolveUserDataDir(), "passwordVault.json"),
    translate: path.join(resolveUserDataDir(), "translate.json"),
  },
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
const pathConfig =
  process.env.NODE_ENV === "development"
    ? filesPath.development
    : filesPath.production;
export class StoreManager {
  storage = new Map();
  configFile = pathConfig.userData;
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
    this.configFile = pathConfig[props];
    this.initialize(props);
  }
  initialize(fileName: StoreName) {
    try {
      const filePath = pathConfig[fileName];
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      const isExist = fs.existsSync(pathConfig[fileName]);
      if (!isExist) {
        fs.writeFileSync(pathConfig[fileName], JSON.stringify([]), "utf-8");
      }
    } catch (error) {
      console.log("[ERROR] StoreManager initialize -", error);
    }
  }

  readFiles = <T>(): Promise<T> => {
    return new Promise((resolve, reject) => {
      log.info("Đang đọc file: ", this.configFile);
      fs.readFile(this.configFile, "utf-8", (error, data) => {
        // 1. Xử lý lỗi hệ thống (ví dụ: File không tồn tại)
        if (error) {
          log.error("Lỗi hệ thống khi đọc file:", error);
          return reject(error);
        }

        // 2. Kiểm tra nếu data bị trống (0 bytes)
        if (!data || data.trim() === "") {
          log.warn("File trống, trả về object rỗng");
          return resolve({} as T);
        }

        try {
          // 3. Parse JSON an toàn
          const json = JSON.parse(data);
          resolve(json);
        } catch (parseError) {
          log.error("Lỗi định dạng JSON không hợp lệ:", parseError);
          // Nếu file hỏng (không phải JSON), trả về object rỗng thay vì làm crash app
          resolve({} as T);
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
