import { BrowserWindow } from "electron";
import { SpotlightService } from "../service";
import { Tab } from "~/features/tabs/models/tab";
import { IHistoryEntry } from "~/main/core/controller/history";

export class SpotlightController {
  private service = new SpotlightService();
  init(mainWindow: BrowserWindow) {
    this.service.init(mainWindow);
  }
  async open(payload?: { query?: string; tabs?: ReturnType<Tab["toJSON"]>[]; history?: IHistoryEntry[] }) {
    return this.service.openSpotlight(payload);
  }

  close() {
    return this.service.close();
  }

  syncTabs(tabs: ReturnType<Tab["toJSON"]>[]) {
    return this.service.syncTabs(tabs);
  }

  warmup() {
    return this.service.warmup();
  }

  destroy() {
    this.service.destroy();
  }

  get isOpen() {
    return this.service.isOpen;
  }
}
