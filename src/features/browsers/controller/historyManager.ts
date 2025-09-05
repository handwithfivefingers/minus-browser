import { v4 as uuid_v4 } from "uuid";
interface ITab {
  id?: string;
  name: string;
  url: string;
  index: number;
  isPinned: boolean;
  isFocused: boolean;
}
class TabManager {
  tabs: Map<string, ITab> = new Map();
  index = 0;
  constructor() {}
  getTab(id: string) {
    const isExist = this.tabs.has(id);
    if (!isExist) return "Tab not found";
    return this.tabs.get(id);
  }

  createTab(tab: Omit<ITab, "id">) {
    this.index++;
    const id = uuid_v4();
    this.tabs.set(id, { ...tab, id });
  }

  updateTab(id: string, updateParams: Partial<ITab>) {
    if (!this.tabs.has(id)) return "Tab not found";
    this.tabs.set(id, { ...this.tabs.get(id), ...updateParams });
  }

  deleteTab(id: string) {
    if (!this.tabs.has(id)) return "Tab not found";
    this.tabs.delete(id);
  }
}

export default new TabManager();
