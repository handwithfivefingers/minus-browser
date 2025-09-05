import { ipcMain } from "electron";
import { storeManager } from "../stores";
import fs from "node:fs";
import log from "electron-log";
interface IAppData {
  appName: string;
  appURL: string;
}

interface IApp {
  [key: string]:
    | {
        appName: string;
        appURL: string;
      }
    | unknown;
}

enum APP_STATE {
  ADD = "add-app",
  GETS = "get-apps",
  DEL = "delete-app",
}
export class CustomAppController {
  constructor() {
    this.init();
  }

  loadApps = async () => {
    try {
      log.info("Loading apps from store");
      const resp = await storeManager.readFiles();
      return resp;
    } catch (error) {
      log.error("Error loading files:", error);
      return {};
    }
  };
  saveApps = (apps: IApp) => {
    fs.writeFileSync(storeManager.configFile, JSON.stringify(apps, null, 2), "utf-8");
    log.info("Apps saved successfully");
  };
  init = () => {
    ipcMain.handle(APP_STATE.ADD, async (event, appData: IAppData) => {
      try {
        const apps = await this.loadApps();
        const base64 = Buffer.from(appData.appURL, "utf8").toString("base64");
        apps[base64] = {
          ...appData,
        };
        this.saveApps(apps);
        log.info("App added successfully:", appData.appName);
      } catch (error) {
        log.error("Error adding app:", error);
      }
    });
    ipcMain.handle(APP_STATE.GETS, async () => {
      try {
        const app = await this.loadApps();
        log.info("Fetching apps from store");
        return app;
      } catch (error) {
        log.error("Error fetching apps:", error);
      }
    });
    ipcMain.handle(APP_STATE.DEL, async (event, url: string) => {
      try {
        const app = await this.loadApps();
        const base64 = Buffer.from(url, "utf8").toString("base64");
        delete app[base64];
        this.saveApps(app);
        return true;
      } catch (error) {
        log.error(`ERROR ${APP_STATE.DEL} ${url}:`, error);
      }
    });
  };
}
