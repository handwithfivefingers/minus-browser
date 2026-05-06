import { create } from "zustand";
import { TabStore, Tab } from "~/features/ui/interfaces";

const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  index: 0,

  setTabs: (tabs: Tab[]) => set((state) => ({ ...state, tabs: tabs })),
  updateTab: (tabId: string, tab: Partial<Tab>) => {
    return set((state) => {
      const index = state.tabs.findIndex((item) => item.id === tabId);
      if (index !== -1) {
        let target = state.tabs[index];
        target = {
          ...target,
          ...tab,
        };
        state.tabs[index] = target;
        if (target.id === state.activeTab.id) {
          state.activeTab = target;
        }
        return { ...state };
      }
    });
  },
  setActiveTab: (tabId: string) =>
    set((state) => {
      console.log("active Index", tabId);
      const index = state.tabs.findIndex((item) => item.id === tabId);
      if (index !== -1) {
        let target = state.tabs[index];
        state.activeTab = target;
        return { ...state };
      }
    }),

  // tabsIndex: {},
  // initialize: ({ tabs }: { tabs: Tab[] }) => {
  //   return set((state) => {
  //     const newTabs: Tab[] = [];
  //     const tabsIndex: { [key: string]: number } = {};
  //     let index = 0;
  //     for (index; index < tabs.length; index++) {
  //       const tab = tabs[index];
  //       const newTab = new Tab({
  //         ...tab,
  //         index,
  //       });
  //       newTabs.push(newTab);
  //       tabsIndex[newTab.id] = index;
  //     }
  //     return {
  //       ...state,
  //       tabs: newTabs,
  //       index: index,
  //       tabsIndex,
  //     };
  //   });
  // },
  // getTabById: (id: string) => {
  //   const currentIndex = get().tabsIndex[id];
  //   if (currentIndex === undefined) return null;
  //   return get().tabs[currentIndex];
  // },
  // addNewTab: (tab?: Partial<Tab>) => {
  //   const tabObject = new Tab({
  //     isFocused: false,
  //     ...tab,
  //   });
  //   set((state) => {
  //     tabObject.index = state.index;
  //     let newIndex = state.index + 1;
  //     const ob = {
  //       tabs: [...state.tabs, tabObject],
  //       index: newIndex,
  //       tabsIndex: { ...state.tabsIndex, [tabObject.id]: state.index },
  //       activeTab: { ...tabObject, isFocused: true },
  //     };
  //     return ob as Partial<TabStore>;
  //   });
  //   return tabObject;
  // },
  // updateTab: (id: string, tab: Partial<Tab>) => {
  //   const currentIndex = get().tabsIndex[id];
  //   if (currentIndex === undefined) return;
  //   return set((state) => {
  //     const updatedTab = new Tab({ ...state.tabs[currentIndex], ...tab });
  //     state.tabs[currentIndex] = updatedTab;
  //     if (state.activeTab?.id === id) {
  //       state.activeTab = updatedTab;
  //     }
  //     return { ...state, tabs: [...state.tabs] };
  //   });
  // },
  // setActiveTab: (id: string) => {
  //   const currentIndex = get().tabsIndex[id];
  //   if (currentIndex === undefined) return;
  //   return set((state) => ({ ...state, activeTab: state.tabs[currentIndex] }));
  // },
  // closeTab(tab: Tab) {
  //   let nextIndex: number | undefined = 0;
  //   let nextTab: Tab | undefined = undefined;
  //   set((state) => {
  //     const tabsIndex = state.tabsIndex[tab.id];
  //     delete state.tabs[tabsIndex];
  //     delete state.tabsIndex[tab.id];
  //     if (tabsIndex > 0 && state.tabs[tabsIndex - 1]) {
  //       nextTab = state.tabs[tabsIndex - 1];
  //       nextIndex = tabsIndex - 1;
  //     }
  //     return { ...state };
  //   });
  //   return { nextIndex, nextTab };
  // },
  sync: () => {
    try {
      const tabs = get().tabs.filter((item) => !!item);
      window.api.INVOKE("CLOUD_SAVE", { data: tabs });
      return;
    } catch (error) {
      console.log("Syncing tabs Error:", error);
    }
  },
}));

export { useTabStore };
