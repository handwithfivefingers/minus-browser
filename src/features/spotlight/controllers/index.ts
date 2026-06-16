import { SpotlightService } from "../service";
import { Tab } from "~/features/tabs/models/tab";

export class SpotlightController {
  private service = new SpotlightService();
  async open(payload?: { query?: string; tabs?: ReturnType<Tab["toJSON"]>[] }) {
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
