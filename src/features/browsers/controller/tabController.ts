import { View } from "electron";
import log from "electron-log";
import { Tab } from "../classes/tab";
import { ITab } from "../interfaces";
import { StoreManager } from "../stores";
export class TabController {
  tabs: Tab[] = [];
  activeTab: Tab | null;
  tabsIndex: Record<string, number> = {};
  index: number = 0;
  hibernateMapping: Map<string, View> = new Map();
  userStore: StoreManager = new StoreManager("userData");
  bookmarkStore: StoreManager = new StoreManager("bookmark");
  bookmarks: Set<string> = new Set();
  constructor() {
    this.getBookMarks().finally(() => {
      this.initialize();
    });
  }

  async getBookMarks() {
    const bookmarkRaw = await this.bookmarkStore.readFiles<Record<string, string[]>>();
    this.bookmarks = new Set(bookmarkRaw?.bookmark);
  }
  async initialize() {
    try {
      const { tabs = [] } = await this.userStore.readFiles<{ tabs: ITab[]; index: number }>();

      const newTabs: Tab[] = [];
      const tabsIndex: { [key: string]: number } = {};
      let idx = 0;
      for (idx; idx < tabs.length; idx++) {
        const isBookmarked = this.bookmarks.has(new URL(tabs[idx].url).href);
        const tab = tabs[idx];
        const newTab = new Tab({
          ...tab,
          isBookmarked: isBookmarked,
          index: idx,
        });
        newTabs.push(newTab);
        tabsIndex[newTab.id] = idx;
      }
      this.tabsIndex = tabsIndex;
      this.tabs = newTabs;
      this.index = idx;
      log.log("TabController initialized");
      return this;
    } catch (error) {
      console.log("TabController initialize error", error);
    }
  }

  addNewBookmark({ url, id }: Partial<Tab>) {
    const tab = this.getTabById(id);
    const validURL = new URL(url);
    if (tab && !tab.isBookmarked && !this.bookmarks.has(validURL.href)) {
      tab.isBookmarked = true;
      this.updateTab(id, tab);
      this.bookmarks.add(validURL.href);
    } else {
      tab.isBookmarked = false;
      this.bookmarks.delete(validURL.href);
    }
    const mapAsArray = [...this.bookmarks.values()];
    this.bookmarkStore.saveFiles({
      bookmark: mapAsArray,
    });
  }
  getTabById(id: string) {
    const currentIndex = this.tabsIndex[id];
    if (currentIndex === undefined) return null;
    return this.tabs[currentIndex];
  }
  addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: false,
      isBookmarked: false,
      ...tab,
    });
    const tabUrl = new URL(tabObject.url);
    const isBookmarked = this.bookmarks?.has(tabUrl.href);
    tabObject.isBookmarked = isBookmarked;
    tabObject.index = this.index;
    let newIndex = this.index + 1;
    this.tabs = [...this.tabs, tabObject];
    this.tabsIndex[tabObject.id] = this.index;
    this.index = newIndex;
    this.activeTab = tabObject;
    return tabObject;
  }
  updateTab(id: string, tab: Partial<Tab>) {
    log.info("Updated Tab ${id}:", tab);
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
