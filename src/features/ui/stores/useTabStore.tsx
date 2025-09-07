import { create } from "zustand";
import { ITab } from "~/features/browsers";
import { Tab } from "~/features/browsers/controller/tabManager";

interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  tabsIndex: { [key: string]: number };
  initialize: (tabs: ITab[]) => void;
  getTabById: (id: string) => Tab | null;
  addNewTab: (tab?: Partial<Tab>) => void;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
}
const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  tabsIndex: {},
  index: 0,

  initialize: (tabs: ITab[]) => {
    return set((state) => {
      const newTabs: Tab[] = [];
      const tabsIndex: { [key: string]: number } = {};
      let index = 0;
      for (index; index < tabs.length; index++) {
        const tab = tabs[index];
        const newTab = new Tab(tab);
        newTabs.push(newTab);
        tabsIndex[newTab.id] = index;
      }
      return {
        ...state,
        tabs: newTabs,
        index: index,
        tabsIndex,
      };
      // const newTabs = tabs.map((tab) => new Tab(tab));
      // const tabsIndex: { [key: string]: number } = {};
      // newTabs.forEach((tab, idx) => {
      //   tabsIndex[tab.id] = idx;
      // }

      // const tabsIndex: { [key: string]: number } = {};
      // tabs.forEach((tab, idx) => {
      //   tabsIndex[tab.id] = idx;
      // });
      // const activeTab = tabs.find((tab) => tab.isFocused) || null;
      // return {
      //   ...state,
      //   tabs: tabs.map((tab) => new Tab(tab)),
      //   index: tabs.length > 0 ? Math.max(...tabs.map((tab) => tab.index)) : 0,
      //   tabsIndex,
      //   activeTab,
      // };
    });
  },

  getTabById: (id: string) => {
    const currentIndex = get().tabsIndex[id];
    console.log("currentIndex", currentIndex);
    if (currentIndex === undefined) return null;
    return get().tabs[currentIndex];
  },
  addNewTab: (tab?: Partial<Tab>) => {
    console.log("addNewTab");
    return set((state) => {
      const tabObject = new Tab({
        index: state.index,
        isFocused: false,
        ...tab,
      });
      let newIndex = state.index + 1;

      console.log("tabObject", tabObject);
      return {
        ...state,
        tabs: [...state.tabs, tabObject],
        index: newIndex,
        tabsIndex: { ...state.tabsIndex, [tabObject.id]: state.index },
        activeTab: { ...tabObject, isFocused: true },
      };
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
      return { ...state };
    });
  },

  setActiveTab: (id: string) => {
    const currentIndex = get().tabsIndex[id];
    if (currentIndex === undefined) return;
    return set((state) => {
      return { activeTab: state.tabs[currentIndex] };
    });
  },
}));

export { useTabStore };
