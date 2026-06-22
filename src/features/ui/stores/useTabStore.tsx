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
        if (target.id === state.activeTab?.id) {
          state.activeTab = target;
        }
        return { ...state };
      }
      return state;
    });
  },
  setActiveTab: (tabId: string) =>
    set((state) => {
      const index = state.tabs.findIndex((item) => item.id === tabId);
      if (index !== -1) {
        let target = state.tabs[index];
        state.activeTab = target;
        return { ...state };
      }
      return state;
    }),
  sync: () => {
    try {
      const tabs = get().tabs.filter((item) => !!item);
      window.api.INVOKE("CLOUD_SAVE", { data: tabs });
      return;
    } catch (error) {
      console.error("Syncing tabs Error:", error);
    }
  },
}));

export { useTabStore };
