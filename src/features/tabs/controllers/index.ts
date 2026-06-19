import log from "electron-log";
import { cacheSystem } from "~/features/cacheSystem";
import { Tab } from "../models/tab";
import { StoreManager } from "~/core/stores";

export class TabController {
  activeTab: Tab | null = null;
  tabsIndex: Record<string, number> = {};
  index: number = 0;
  tabs: Map<string, Tab> = new Map();
  userStore: StoreManager = new StoreManager("userData");
  interfaceStore: StoreManager = new StoreManager("interface");
  eventEmitter: <T>(payload: { channel: string; data: T }) => void;

  private hibernateTimer: ReturnType<typeof setInterval> | null = null;
  private hibernateAfterMs: number = 60 * 60 * 1000;
  private readonly HIBERNATE_CHECK_MS = 60_000;

  constructor(eventEmitter: <T>(payload: { channel: string; data: T }) => void) {
    this.eventEmitter = eventEmitter;
  }

  async initialize() {
    try {
      const fallback = async () => {
        return this.userStore.readFiles<{
          tabs: Tab[];
          index: number;
          activeTabId: string | null;
        }>();
      };
      const data = await cacheSystem.get<{
        tabs: Tab[];
        index: number;
        activeTabId: string | null;
      }>("tab", fallback);
      const tabs = data?.tabs || [];
      const activeTabId = data?.activeTabId || null;
      const newTabs = new Map();
      const tabsIndex: { [key: string]: number } = {};
      let idx = 0;
      let activeTabRestored: Tab | null = null;
      for (idx; idx < tabs?.length; idx++) {
        const tab = tabs[idx];
        if (!tab) continue;
        const newTab = new Tab({
          ...tab,
          index: idx,
          eventEmitter: this.eventEmitter,
        });
        newTabs.set(newTab.id, newTab);
        if (newTab.id === activeTabId) {
          activeTabRestored = newTab;
        }
      }

      if (activeTabRestored) {
        activeTabRestored.createView();
        this.activeTab = activeTabRestored;
      } else if (newTabs.size > 0) {
        const firstTab = newTabs.values().next().value as Tab;
        firstTab.createView();
        this.activeTab = firstTab;
      }

      this.tabsIndex = tabsIndex;
      this.tabs = newTabs;
      this.index = idx;
      this.startHibernateTimer();
      return this;
    } catch (error) {
      log.error("TabController initialize error", error);
    }
  }

  private startHibernateTimer() {
    this.stopHibernateTimer();
    this.hibernateTimer = setInterval(() => {
      const now = Date.now();
      console.log("Check hibernate");
      for (const [, tab] of this.tabs) {
        if (tab.id === this.activeTab?.id) continue;
        if (tab.isPinned) continue;
        if (tab.preventHibernate) continue;
        if (tab.isHibernated) continue;
        if (!tab.isAlive) continue;
        if (now - tab.timestamp > this.hibernateAfterMs) {
          tab.hibernate();
        }
      }
    }, this.HIBERNATE_CHECK_MS);
  }

  setHibernateMode(mode: "fast" | "normal" | "slow" | "custom", customMinutes?: number) {
    switch (mode) {
      case "fast":
        this.hibernateAfterMs = 15 * 60 * 1000;
        break;
      case "normal":
        this.hibernateAfterMs = 60 * 60 * 1000;
        break;
      case "slow":
        this.hibernateAfterMs = 4 * 60 * 60 * 1000;
        break;
      case "custom":
        this.hibernateAfterMs = (customMinutes || 60) * 60 * 1000;
        break;
    }
  }

  private stopHibernateTimer() {
    if (this.hibernateTimer) {
      clearInterval(this.hibernateTimer);
      this.hibernateTimer = null;
    }
  }

  hibernateTab(id: string) {
    const tab = this.tabs.get(id);
    if (!tab || tab.id === this.activeTab?.id || tab.isPinned) return;
    tab.hibernate();
    this.syncCache();
  }

  togglePreventHibernate(id: string) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.preventHibernate = !tab.preventHibernate;
    this.syncCache();
    return tab.toJSON();
  }

  restoreTab(id: string) {
    const tab = this.tabs.get(id);
    if (!tab || !tab.isHibernated) return;
    tab.wake();
    this.syncCache();
  }

  getTabs() {
    const tabs = this.tabs.size > 0 ? [...this.tabs.values()].map((tab) => tab.toJSON()) : [];
    return tabs;
  }
  getTabInstances(): Tab[] {
    return [...this.tabs.values()];
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
    try {
      tabObject.index = this.index;
      let newIndex = this.index + 1;
      tabObject.createView();
      this.tabs.set(tabObject.id, tabObject);
      this.index = newIndex;
      this.activeTab = tabObject;
      const tabJSON = tabObject.toJSON();
      return tabJSON;
    } catch (err) {
    } finally {
      this.syncCache();
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
      this.syncCache();
    }
  }

  closeTab(id: string) {
    const tab = this.getTabById(id);
    if (!tab) return { nextIndex: undefined, nextTab: undefined };
    if (tab.isAlive) {
      tab.hide();
      tab.destroyView();
    }
    this.tabs.delete(id);
    this.syncCache();
    const result = this.getPreviousTab(id);
    return result;
  }

  togglePinTab(id: string) {
    const tab = this.tabs.get(id);
    if (!tab) return;
    tab.isPinned = !tab.isPinned;
    this.syncCache();
    return tab.toJSON();
  }

  reorderTabs(orderedIds: string[]) {
    const newTabs = new Map<string, Tab>();
    for (const id of orderedIds) {
      if (this.tabs.has(id)) {
        newTabs.set(id, this.tabs.get(id)!);
      }
    }
    for (const [id, tab] of this.tabs) {
      if (!newTabs.has(id)) {
        newTabs.set(id, tab);
      }
    }
    this.tabs = newTabs;
    this.syncCache();
    return this.getTabs();
  }

  setActiveTab(id: string) {
    const currentTab = this.getTabById(id);
    if (!currentTab) return;
    if (currentTab.isHibernated) {
      currentTab.wake();
    }
    currentTab.timestamp = Date.now();
    this.activeTab = currentTab;
  }

  private syncCache() {
    const persisted = {
      tabs: this.getTabs(),
      index: this.index,
      activeTabId: this.activeTab?.id || null,
    };
    cacheSystem.set("tab", persisted as any);
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
    }
    if (result.nextTab?.isHibernated) {
      result.nextTab.wake();
    }
    return result;
  }

  destroy() {
    this.stopHibernateTimer();
    for (const [, tab] of this.tabs) {
      if (tab.isAlive) tab.destroyView();
    }
    this.tabs.clear();
    this.activeTab = null;
  }
}
