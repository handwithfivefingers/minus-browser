import { create } from "zustand";
import { ITab } from "~/features/browsers";
import { Tab } from "~/features/browsers/controller/tabManager";

interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  tabsIndex: { [key: string]: number };
  initialize: ({ tabs }: { tabs: ITab[] }) => void;
  getTabById: (id: string) => Tab | null;
  addNewTab: (tab?: Partial<Tab>) => void;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  closeTab: (tab: Tab) => { nextIndex: number | undefined; nextTab: Tab | undefined };
}
const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  tabsIndex: {},
  index: 0,

  initialize: ({ tabs }: { tabs: ITab[] }) => {
    return set((state) => {
      const newTabs: Tab[] = [];
      const tabsIndex: { [key: string]: number } = {};
      let index = 0;
      for (index; index < tabs.length; index++) {
        const tab = tabs[index];
        const newTab = new Tab({
          ...tab,
          index,
        });
        newTabs.push(newTab);
        tabsIndex[newTab.id] = index;
      }
      return {
        ...state,
        tabs: newTabs,
        index: index,
        tabsIndex,
      };
    });
  },
  getTabById: (id: string) => {
    const currentIndex = get().tabsIndex[id];
    if (currentIndex === undefined) return null;
    return get().tabs[currentIndex];
  },
  addNewTab: (tab?: Partial<Tab>) => {
    return set((state) => {
      const tabObject = new Tab({
        index: state.index,
        isFocused: false,
        ...tab,
      });
      let newIndex = state.index + 1;
      const ob = {
        tabs: [...state.tabs, tabObject],
        index: newIndex,
        tabsIndex: { ...state.tabsIndex, [tabObject.id]: state.index },
        activeTab: { ...tabObject, isFocused: true },
      };
      return ob as Partial<TabStore>;
    });
  },
  updateTab: (id: string, tab: Partial<Tab>) => {
    const currentIndex = get().tabsIndex[id];
    if (currentIndex === undefined) return;
    return set((state) => {
      const updatedTab = new Tab({ ...state.tabs[currentIndex], ...tab });
      state.tabs[currentIndex] = updatedTab;
      if (state.activeTab?.id === id) {
        state.activeTab = updatedTab;
      }
      return { ...state, tabs: [...state.tabs] };
    });
  },
  setActiveTab: (id: string) => {
    const currentIndex = get().tabsIndex[id];
    if (currentIndex === undefined) return;
    return set((state) => {
      return { activeTab: state.tabs[currentIndex] };
    });
  },
  closeTab(tab: Tab) {
    let nextIndex: number | undefined = 0;
    let nextTab: Tab | undefined = undefined;
    set((state) => {
      const tabsIndex = state.tabsIndex[tab.id];
      delete state.tabs[tabsIndex];
      delete state.tabsIndex[tab.id];
      if (tabsIndex > 0 && state.tabs[tabsIndex - 1]) {
        nextTab = state.tabs[tabsIndex - 1];
        nextIndex = tabsIndex - 1;
      }
      return { ...state };
    });
    return { nextIndex, nextTab };
  },
}));

export { useTabStore };
