import { View } from "electron";
import log from "electron-log";
import { StoreManager } from "../../stores";
import { Tab } from "../../classes/tab";
import { ITab } from "../../interfaces";
import { Bookmark } from "../bookmark";
export class TabController {
  // tabs: Tab[] = [];
  activeTab: Tab | null;
  tabsIndex: Record<string, number> = {};
  index: number = 0;
  hibernateMapping: Map<string, View> = new Map();
  userStore: StoreManager = new StoreManager("userData");
  bm = new Bookmark();
  tabs: Map<string, Tab> = new Map();
  constructor() {}
  async initialize() {
    try {
      console.log("TabController initalize");
      await this.bm.initialize();
      const { tabs = [] } = await this.userStore.readFiles<{ tabs: ITab[]; index: number }>();
      const newTabs = new Map();
      const tabsIndex: { [key: string]: number } = {};
      let idx = 0;
      for (idx; idx < tabs.length; idx++) {
        const isBookmarked = this.bm.bookmarks.has(new URL(tabs[idx].url).href);
        const tab = tabs[idx];
        delete tab.id;
        const newTab = new Tab({
          ...tab,
          isBookmarked: isBookmarked,
          index: idx,
        });
        newTabs.set(newTab.id, newTab);
      }
      console.log("newTabs", newTabs);
      this.tabsIndex = tabsIndex;
      this.tabs = newTabs;
      this.index = idx;
      log.log("TabController initialized");
      return this;
    } catch (error) {
      console.log("TabController initialize error", error);
    } finally {
      console.log("tabs", this.tabs);
    }
  }

  addNewBookmark({ id }: Partial<Tab>) {
    const tab = this.getTabById(id);
    const isBookmarked = this.bm.bookmarks.has(tab.url);
    console.log("isBookmarked", isBookmarked);
    if (!isBookmarked) {
      tab.isBookmarked = true;
      this.bm.bookmarks.add(tab.url);
    } else {
      tab.isBookmarked = false;
      this.bm.bookmarks.delete(tab.url);
    }
    tab.updateTab(tab);
    this.bm.saveBookmark();
  }
  getTabById(id: string) {
    // const currentIndex = this.tabsIndex[id];
    // if (currentIndex === undefined) return null;
    // return this.tabs[currentIndex];
    return this.tabs.get(id) || null;
  }
  addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: false,
      isBookmarked: false,
      ...tab,
    });
    const tabUrl = new URL(tabObject.url);
    const isBookmarked = this.bm.bookmarks?.has(tabUrl.href);
    tabObject.isBookmarked = isBookmarked;
    tabObject.index = this.index;
    let newIndex = this.index + 1;
    this.tabs.set(tabObject.id, tabObject);
    this.index = newIndex;
    this.activeTab = tabObject;
    return tabObject;
  }
  updateTab(id: string, tab: Partial<Tab>) {
    log.info("Updated Tab ${id}:", tab);
    const currentTab = this.getTabById(id);
    if (!currentTab) return;
    const updatedTab = new Tab({ ...currentTab, ...tab });
    this.tabs.set(id, updatedTab);
    if (this.activeTab?.id === id) {
      this.activeTab = updatedTab;
    }
    return updatedTab;
  }
  closeTab(id: string) {
    const { ...tab } = this.getTabById(id);
    this.tabs.delete(id);
    const { nextIndex, nextTab } = this.getPreviousTab(tab.id);
    return { nextIndex, nextTab };
  }
  setActiveTab(id: string) {
    const currentTab = this.getTabById(id);
    currentTab.timestamp = Date.now();
    this.activeTab = currentTab;
  }
  hibernateTab(id: string) {
    // const currentIndex = this.tabsIndex[id];
    // if (currentIndex === undefined) return;
    // // const tab = this.tabs[currentIndex];
    // tab.timestamp = Date.now();
    // this.activeTab = tab;
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

  private getPreviousTab(id: string) {
    const entries = Array.from(this.tabs.entries());
    let result: Record<any, any> = {
      nextIndex: undefined,
      nextTab: undefined,
    };
    for (let [key, value] of entries) {
      if (key === id) break;
      result = { nextIndex: value.index, nextTab: value };
    }
    return result;
  }
}
