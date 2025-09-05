import log from "electron-log";
import { v4 as uuid_v4 } from "uuid";
import { ITab, ITabManager } from "../interfaces";

class Tab implements ITab {
  id: string = uuid_v4();
  title: string = "Blank";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = true;
  index: number;
  backwardHistory: string[] = [];
  forwardHistory: string[] = [];

  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }

  updateTitle(title: string) {
    this.title = title;
  }

  updateUrl(url: string) {
    this.url = url;
  }

  onBackward() {
    this.forwardHistory.push(this.url);
    this.url = this.backwardHistory.pop();
  }

  onForward() {
    this.backwardHistory.push(this.url);
    this.url = this.forwardHistory.pop();
  }

  onFocus() {
    this.isFocused = true;
  }
  onBlur() {
    this.isFocused = false;
  }
}

interface ITabManagerProps {
  index: number;
  tabs: ITab[];
}
class TabManager implements ITabManager {
  tabs: Map<string, Tab> = new Map();
  index = 0;
  activeTab: ITab;

  get getLastIndex() {
    const tabs = this.getTabs;
    let maxIndex = 0;
    for (let i = 0; i < tabs.length; i++) {
      const current = tabs[i];
      if (current.index > maxIndex) {
        maxIndex = current.index;
      }
    }
    return maxIndex;
  }

  get getTabs() {
    if (this.tabs.size) return Array.from(this.tabs.values());
    return [];
  }
  constructor({ index = 0, tabs = [] }: ITabManagerProps) {
    this.fromJSON({ tabs, index });
  }

  selectTab(id: string) {
    if (this.activeTab) this.activeTab.onBlur();
    this.activeTab = this.tabs.get(id);
    this.activeTab.onFocus();
  }

  getTab(id: string) {
    const isExist = this.tabs.has(id);
    if (!isExist) return false;
    return this.tabs.get(id);
  }

  createTab(tab?: Partial<ITab>) {
    try {
      this.index = this.getLastIndex + 1;
      const newTab = new Tab({
        index: this.index,
        isFocused: true,
        ...tab,
      });
      this.tabs.set(newTab.id, newTab);
      this.activeTab = newTab;
      return newTab.id;
    } catch (error) {
      console.log("createTab error", error);
      return false;
    }
  }

  updateTab(id: string, updateParams: Partial<ITab>) {
    const isExist = this.tabs.has(id);
    if (!isExist) return "Tab not found";
    const updatedTab = {
      ...this.tabs.get(id),
      ...updateParams,
    };
    this.tabs.set(id, new Tab(updatedTab));
  }

  deleteTab(id: string) {
    if (!this.tabs.has(id)) return "Tab not found";
    this.tabs.delete(id);
  }

  getNextTab() {
    const tabs = this.getTabs;
  }
  getPreviousTab() {
    const tabs = this.getTabs;
  }

  toJSON() {
    return {
      tabs: Array.from(this.tabs.values()),
      index: this.index,
    };
  }

  toString() {
    return JSON.stringify(this.toJSON());
  }

  fromString(str: string) {
    const { tabs, index } = JSON.parse(str);
    const newTabs = new Map();
    for (let tab of tabs) {
      const newTab = new Tab(tab);
      newTabs.set(newTab.id, newTab);
    }
    this.tabs = newTabs;
    this.index = index;
  }

  fromJSON({ tabs, index }: { tabs: ITab[]; index: number }) {
    try {
      const newTabs = new Map();
      for (let tab of tabs) {
        const newTab = new Tab(tab);
        newTabs.set(`${newTab.id}`, newTab);
      }
      this.tabs = newTabs;
      this.index = index;
    } catch (error) {
      log.info("ERROR >", error);
    }
  }
}

export default TabManager;
