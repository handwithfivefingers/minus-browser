import { View } from "electron";
import log from "electron-log";
import { StoreManager } from "../../stores";
import { Tab } from "../../classes/tab";
import { ITab } from "../../interfaces";
import { Bookmark } from "../bookmark";
import { AdBlocker } from "../adsBlock";
import { UserScriptController } from "../userScript";
export class TabController {
  activeTab: Tab | null = null;
  tabsIndex: Record<string, number> = {};
  index: number = 0;
  hibernateMapping: Map<string, View> = new Map();
  userStore: StoreManager = new StoreManager("userData");
  bookmark = new Bookmark();
  tabs: Map<string, Tab> = new Map();
  AdBlock = new AdBlocker();
  userScripts = new UserScriptController();
  async initialize() {
    try {
      log.log("TabController initalizing...");
      await this.bookmark.initialize();
      await this.AdBlock.initialize();
      await this.userScripts.initialize();
      // Đảm bảo readFiles luôn trả về object mặc định nếu file lỗi/rỗng
      const data = await this.userStore.readFiles<{
        tabs: ITab[];
        index: number;
      }>();
      const tabs = data?.tabs || [];
      const newTabs = new Map();
      const tabsIndex: { [key: string]: number } = {};
      let idx = 0;
      for (idx; idx < tabs?.length; idx++) {
        let isBookmarked = false;
        try {
          if (tabs[idx] && tabs[idx].url) {
            const validUrl = new URL(tabs[idx].url).href;
            isBookmarked = this.bookmark.bookmarks.has(validUrl);
          }
        } catch (urlError) {
          console.warn(`Invalid URL at index ${idx}:`, tabs[idx].url);
        }

        const tab = tabs[idx];
        // Tránh lỗi nếu phần tử tab bị undefined
        if (!tab) continue;

        delete tab.id;
        const newTab = new Tab({
          ...tab,
          isBookmarked: isBookmarked,
          index: idx,
          blocker: this.AdBlock,
          userscriptController: this.userScripts,
        });
        newTabs.set(newTab.id, newTab);
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
  addNewBookmark({ id }: Partial<Tab>) {
    const tab = this.getTabById(id as string);
    const isBookmarked = this.bookmark.bookmarks.has(tab?.url as string);
    if (!tab) return;
    if (!isBookmarked) {
      tab.isBookmarked = true;
      this.bookmark.bookmarks.add(tab.url);
    } else {
      tab.isBookmarked = false;
      this.bookmark.bookmarks.delete(tab.url);
    }
    tab.updateTab(tab);
    this.bookmark.saveBookmark();
  }
  getTabs() {
    const tabs = this.tabs.size > 0 ? [...this.tabs.values()].map((tab) => tab.toJSON()) : [];
    return tabs;
  }
  getTabById(id: string) {
    return this.tabs.get(id) || null;
  }
  addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: false,
      isBookmarked: false,
      blocker: this.AdBlock,
      userscriptController: this.userScripts,
      ...tab,
    });
    const tabUrl = new URL(tabObject?.url || "https://google.com");
    const isBookmarked = this.bookmark.bookmarks?.has(tabUrl.href);
    tabObject.isBookmarked = isBookmarked;
    tabObject.index = this.index;
    let newIndex = this.index + 1;
    this.tabs.set(tabObject.id, tabObject);
    this.index = newIndex;
    this.activeTab = tabObject;
    return tabObject.toJSON();
  }
  updateTab(id: string, tab: Partial<Tab>) {
    log.info("Updated Tab ${id}:", tab);
    const currentTab = this.getTabById(id);
    if (!currentTab) return;
    const updatedTab = new Tab({
      ...currentTab,
      ...tab,
      blocker: this.AdBlock,
      userscriptController: this.userScripts,
    });
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
    if (!currentTab) return;
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
      1000 * 60 * 5,
    );
  }
  private getPreviousTab(id: string) {
    const entries = Array.from(this.tabs.entries());
    const result: {
      nextIndex: number | undefined;
      nextTab: Tab | undefined;
    } = {
      nextIndex: undefined,
      nextTab: undefined,
    };
    for (let [key, value] of entries) {
      if (key === id) break;
      result.nextIndex = value.index;
      result.nextTab = value;
      // result = { nextIndex: value.index, nextTab: value };
    }
    return result;
  }
}
