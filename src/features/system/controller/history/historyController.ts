import { StoreManager } from "../../stores";

interface IHistory {
  title: string;
  url: string;
}
export class History {
  historyStore: StoreManager = new StoreManager("history");
  history: IHistory[];
  constructor() {
    this.initialize();
  }
  async initialize() {
    const historyRaw = await this.historyStore.readFiles<Record<string, IHistory[]>>();
    this.history = historyRaw?.history;
  }
}
