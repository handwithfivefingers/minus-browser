import fs from "node:fs";
import { BrowserWindow, Cookie, session, WebContentsView, app } from "electron";
import path from "node:path";
import log from "electron-log";
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

  getCookieFromStores = async (url: string) => {
    try {
      const base64 = Buffer.from(url, "utf8").toString("base64");
      const resp = await this.readFiles();
      const respValue = resp[base64] as Record<string, any>;
      return "cookies" in respValue ? respValue.cookies : [];
    } catch (error) {
      log.error("getCookieFromStores error: ", error);
      return [];
    }
  };
  getCurrentViewCookies = async () => {
    const cookies: Cookie[] = await session.defaultSession.cookies.get({});
    return cookies;
  };

  saveViewCookies = async (url: string) => {
    const cookies = await session.defaultSession.cookies.get({});
    const base64 = Buffer.from(url, "utf8").toString("base64");
    const stateFile = `userData.json`;
    const d = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
    d[base64] = this.getCurrentViewCookies();
    if (fs.readFileSync(stateFile, "utf-8")) {
      const d = JSON.parse(fs.readFileSync(stateFile, "utf-8"));
      d[base64] = {
        ...d[base64],
        cookies: cookies,
      };
      fs.writeFileSync(stateFile, JSON.stringify(d, null, 2), "utf-8");
      return d[base64];
    } else {
      const d = { [base64]: { cookies: cookies } };
      fs.writeFileSync(stateFile, JSON.stringify(d, null, 2), "utf-8");
    }
    return [];
  };

  getOrCreateView = async (mainWindow: BrowserWindow, url: string) => {
    if (this.storage.has(url)) {
      const cookies = await this.getCookieFromStores(url);
      if (cookies.length > 0) {
        for (let cookie of cookies) {
          const cookieObject = { ...cookie, url: url, name: cookie.name, value: cookie.value };
          session.defaultSession.cookies.set(cookieObject).catch((err) => {
            log.error("fn getOrCreateView() >>> set cookie  error: ", err);
          });
        }
      }
      return this.storage.get(url);
    } else {
      const cookies = await this.getCookieFromStores(url);
      if (cookies.length > 0) {
        for (let cookie of cookies) {
          const cookieObject = { ...cookie, url: url, name: cookie.name, value: cookie.value };
          session.defaultSession.cookies.set(cookieObject).catch((err) => {
            log.error("fn getOrCreateView() >>> set cookie  error: ", err);
          });
        }
      }
      const sampleView = new WebContentsView({});
      mainWindow.contentView.addChildView(sampleView);
      sampleView.webContents.loadURL(url);
      this.storage.set(url, sampleView);
      return sampleView;
    }
  };

  loadSampleData = () => {
    const sample = `{"aHR0cHM6Ly93ZWIuZmxvd2FyZS5jb20=":[{"name":"_csrf","value":"JcIXgX5gRey7cLW7zNDiQ6iT","domain":".floware.com","hostOnly":false,"path":"/","secure":true,"httpOnly":true,"session":true,"sameSite":"unspecified"},{"name":"authorization","value":"ed795d34bd867c6d962f02a691ab7ccff6ff9a9008940acc7eb4b2a3a4b055c25bb0d9171f9a34ba490c64e474921bbc","domain":".floware.com","hostOnly":false,"path":"/","secure":true,"httpOnly":true,"session":true,"sameSite":"unspecified"},{"name":"is_remember","value":"false","domain":".floware.com","hostOnly":false,"path":"/","secure":true,"httpOnly":true,"session":true,"sameSite":"unspecified"}]}`;
    fs.writeFile(this.configFile, sample, "utf8", (error) => {
      if (error) log.log("write sample data error", error);
    });
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
