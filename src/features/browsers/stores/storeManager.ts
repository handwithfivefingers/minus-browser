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
    userscripts: path.join("appData", "userscripts.json"),
    passwordVault: path.join("appData", "passwordVault.json"),
  },
  production: {
    userData: path.join(app.getPath("userData"), "userData.json"),
    interface: path.join(app.getPath("userData"), "interface.json"),
    session: path.join(app.getPath("userData"), "session.json"),
    bookmark: path.join(app.getPath("userData"), "bookmark.json"),
    history: path.join(app.getPath("userData"), "history.json"),
    userscripts: path.join(app.getPath("userData"), "userscripts.json"),
    passwordVault: path.join(app.getPath("userData"), "passwordVault.json"),
  },
};

type StoreName =
  | "userData"
  | "interface"
  | "session"
  | "bookmark"
  | "history"
  | "userscripts"
  | "passwordVault";
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
      ].includes(props)
    ) {
      throw new Error("Invalid props");
    }
    this.configFile = pathConfig[props];
    this.initialize(props);
  }
  initialize(fileName: StoreName) {
    try {
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
