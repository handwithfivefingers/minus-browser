import { View } from "electron";
import { Tab } from "../classes/tab";
import { ITab } from "../interfaces";
import log from "electron-log";
export class TabController {
  tabs: Tab[];
  activeTab: Tab | null;
  tabsIndex: Record<string, number>;
  index: number;
  wTabs = new WeakMap();
  hibernateMapping: Map<string, View> = new Map();
  constructor(props?: { tabs: ITab[] }) {
    this.initialize(props);
    this.hibernateAlarm();
  }
  initialize(props?: { tabs: ITab[] }) {
    log.info("TabController initialized");
    const newTabs: Tab[] = [];
    const tabsIndex: { [key: string]: number } = {};
    let index = 0;
    for (index; index < props?.tabs.length; index++) {
      const tab = props?.tabs[index];
      const newTab = new Tab({
        ...tab,
        index,
      });
      newTabs.push(newTab);
      tabsIndex[newTab.id] = index;
    }

    this.tabsIndex = tabsIndex;
    this.tabs = newTabs;
    this.index = index;
  }
  getTabById(id: string) {
    const currentIndex = this.tabsIndex[id];
    if (currentIndex === undefined) return null;
    return this.tabs[currentIndex];
  }
  addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: true,
      ...tab,
    });
    tabObject.index = this.index;
    let newIndex = this.index + 1;
    this.tabs = [...this.tabs, tabObject];
    this.tabsIndex[tabObject.id] = this.index;
    this.index = newIndex;
    this.activeTab = tabObject;
    return tabObject;
  }
  updateTab(id: string, tab: Partial<Tab>) {
    log.info("Updated Tab ${id}:", tab )
    const currentIndex = this.tabsIndex[id];
    if (currentIndex === undefined) return;
    const updatedTab = new Tab({ ...this.tabs[currentIndex], ...tab });
    this.tabs[currentIndex] = updatedTab;
    if (this.activeTab?.id === id) {
      this.activeTab = updatedTab;
    }
    return updatedTab;
  }
  closeTab(id: string) {
    const tabsIndex = this.tabsIndex[id];
    delete this.tabs[tabsIndex];
    delete this.tabsIndex[id];
    let nextIndex: number | undefined = 0;
    let nextTab: Tab | undefined = undefined;
    nextIndex = tabsIndex - 1;
    nextTab = this.getPreviousTab(tabsIndex);
    return { nextIndex, nextTab };
  }
  setActiveTab(id: string) {
    const currentIndex = this.tabsIndex[id];
    if (currentIndex === undefined) return;
    const tab = this.tabs[currentIndex];
    tab.timestamp = Date.now();
    this.activeTab = tab;
  }
  hibernateTab(id: string) {
    const currentIndex = this.tabsIndex[id];
    if (currentIndex === undefined) return;
    const tab = this.tabs[currentIndex];
    tab.timestamp = Date.now();
    this.activeTab = tab;
  }
  hibernateAlarm() {
    setInterval(
      () => {
        for (const [id, view] of this.hibernateMapping) {
          console.log("hibernate id", id);
          console.log("hibernate view", view);
        }
      },
      1000 * 60 * 5
    );
  }

  private getPreviousTab(index: number) {
    while (index > 0) {
      index--;
      const tab = this.tabs[index];
      if (tab) {
        return tab;
      }
    }
    return undefined;
  }
}
