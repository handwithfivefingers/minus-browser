import { View } from "electron";
import log from "electron-log";
import { cacheSystem } from "~/features/cacheSystem";
import { StoreManager } from "../../system/stores";
import { Tab } from "../models/tab";

export class TabController {
  activeTab: Tab | null = null;
  tabsIndex: Record<string, number> = {};
  index: number = 0;
  hibernateMapping: Map<string, View> = new Map();
  tabs: Map<string, Tab> = new Map();
  userStore: StoreManager = new StoreManager("userData");
  interface: StoreManager = new StoreManager("interface");
  eventEmitter: <T>(payload: { channel: string; data: T }) => void;

  // private pluginManager: TabPluginManager = new TabPluginManager();
  constructor(eventEmitter: <T>(payload: { channel: string; data: T }) => void) {
    // const vaultEmitter = (channel: string, data: any) => {
    //   console.log("vaultEmitter channel", channel);
    //   console.log("vaultEmitter data", data);
    // };
    this.eventEmitter = eventEmitter;
  }

  //   bookmark = new Bookmark();
  //   AdBlock = new AdBlocker();
  //   userScripts = new UserScriptController();

  async initialize() {
    try {
      //   await this.bookmark.initialize();
      //   await this.AdBlock.initialize();
      //   await this.userScripts.initialize();
      // Đảm bảo readFiles luôn trả về object mặc định nếu file lỗi/rỗng
      const fallback = async () => {
        return this.userStore.readFiles<{
          tabs: Tab[];
          index: number;
        }>();
      };
      const data = await cacheSystem.get<{
        tabs: Tab[];
        index: number;
      }>("tab", fallback);
      const tabs = data?.tabs || [];
      const newTabs = new Map();
      const tabsIndex: { [key: string]: number } = {};
      let idx = 0;
      for (idx; idx < tabs?.length; idx++) {
        let isBookmarked = false;
        // try {
        //   if (tabs[idx] && tabs[idx].url) {
        //     const validUrl = new URL(tabs[idx].url).href;
        //     isBookmarked = this.bookmark.bookmarks.has(validUrl);
        //   }
        // } catch (urlError) {
        //   console.warn(`Invalid URL at index ${idx}:`, tabs[idx].url);
        // }

        const tab = tabs[idx];
        // Tránh lỗi nếu phần tử tab bị undefined
        if (!tab) continue;
        // delete tab.id;
        const newTab = new Tab({
          ...tab,
          isBookmarked: isBookmarked,
          index: idx,
          eventEmitter: this.eventEmitter,
        });
        newTabs.set(newTab.id, newTab);
      }
      this.tabsIndex = tabsIndex;
      this.tabs = newTabs;
      this.index = idx;
      return this;
    } catch (error) {
      log.error("TabController initialize error", error);
    }
  }
  getTabs() {
    const tabs = this.tabs.size > 0 ? [...this.tabs.values()].map((tab) => tab.toJSON()) : [];
    return tabs;
  }
  getTabById(id: string) {
    return this.tabs.get(id) || null;
  }
  async addNewTab(tab?: Partial<Tab>) {
    const tabObject = new Tab({
      isFocused: false,
      isBookmarked: false,
      ...tab,
      eventEmitter: this.eventEmitter,
    });
    // const tabUrl = new URL(tabObject?.url || "https://google.com");
    // const isBookmarked = this.bookmark.bookmarks?.has(tabUrl.href);
    // tabObject.isBookmarked = isBookmarked;
    try {
      tabObject.index = this.index;
      let newIndex = this.index + 1;
      this.tabs.set(tabObject.id, tabObject);
      this.index = newIndex;
      this.activeTab = tabObject;
      const tabJSON = tabObject.toJSON();
      return tabJSON;
    } catch (err) {
    } finally {
      const cached = await cacheSystem.get<Tab[]>("tab");
      const nextState = cached?.length ? [...cached] : [];
      cacheSystem.set("tab", [...nextState, tabObject]);
    }
  }
  async updateTab(id: string, tab: Partial<Tab>) {
    log.info("Updated Tab ${id}:", tab);
    const currentTab = this.getTabById(id);
    if (!currentTab) return;
    const updatedTab = new Tab({
      ...currentTab,
      ...tab,
      eventEmitter: this.eventEmitter,
    });
    try {
      this.tabs.set(id, updatedTab);
      if (this.activeTab?.id === id) {
        this.activeTab = updatedTab;
      }
      return updatedTab;
    } catch (error) {
      console.log("updateTab error", error);
    } finally {
      const cached = await cacheSystem.get<Tab[]>("tab");
      const nextState = cached?.length ? [...cached] : [];
      const index = nextState.findIndex((item) => item.id === id);
      if (index !== -1) {
        nextState[index] = updatedTab;
        cacheSystem.set("tab", nextState);
      }
    }
  }

  closeTab(id: string) {
    const { ...tab } = this.getTabById(id);
    this.tabs.delete(id);
    cacheSystem.set("tab", this.getTabs());
    const { nextIndex, nextTab } = this.getPreviousTab(tab.id);
    return { nextIndex, nextTab };
  }

  setActiveTab(id: string) {
    const currentTab = this.getTabById(id);
    if (!currentTab) return;
    currentTab.timestamp = Date.now();
    this.activeTab = currentTab;
  }
  // hibernateTab(id: string) {
  //   // const currentIndex = this.tabsIndex[id];
  //   // if (currentIndex === undefined) return;
  //   // // const tab = this.tabs[currentIndex];
  //   // tab.timestamp = Date.now();
  //   // this.activeTab = tab;
  // }
  // hibernateAlarm() {
  //   setInterval(
  //     () => {
  //       for (const [id, view] of this.hibernateMapping) {
  //         console.log("hibernate id", id);
  //         console.log("hibernate view", view);
  //       }
  //     },
  //     1000 * 60 * 5,
  //   );
  // }
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
