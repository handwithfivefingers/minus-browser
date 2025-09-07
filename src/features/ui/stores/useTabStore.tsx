import { create } from "zustand";
import { ITab } from "~/features/browsers";
import { Tab } from "~/features/browsers/controller/tabManager";

interface TabStore {
  tabs: Map<string, Tab>;
  activeTab: Tab | undefined | null;
  index: number;
  action: {
    initialize: (props: { tabs: ITab[]; index: number }) => void;
    getTabs: () => Tab[];
    getLastIndex: () => number;
    createTab: (tab?: Partial<ITab>) => void;
    setActiveTab: (id: string) => void;
    getActiveTab: (id: string) => ITab | null;
  };
}
const useTabStore = create<TabStore>((set, get) => ({
  tabs: new Map(),
  activeTab: null,
  index: 0,
  action: {
    initialize: ({ tabs, index }: { tabs: ITab[]; index: number }) => {
      try {
        const newTabs = new Map(tabs.map((tab) => [tab.id, new Tab(tab)]));
        return set(() => ({ tabs: newTabs, index, activeTab: newTabs.get(String(index)) || null }));
      } catch (error) {
        console.log("initialize error", error);
      }
    },

    getTabs: () => {
      const tabs = get().tabs;
      if (tabs.size) return Array.from(tabs.values());
      return [];
    },

    getActiveTab: (id: string) => {
      const tabs = get().tabs;
      return tabs.get(id) || null;
    },

    setActiveTab: (id: string) => {
      const tab = get().tabs.get(id);
      if (tab) {
        set({ activeTab: tab, index: tab.index });
      }
    },
    getLastIndex() {
      const tabs = get().tabs;
      if (tabs.size === 0) return 0;
      const indices = Array.from(tabs.values()).map((tab) => tab.index);
      return Math.max(...indices);
    },
    createTab: (tab?: Partial<ITab>) => {
      return set((state) => {
        const index = state.action.getLastIndex() + 1;
        const newTab = new Tab({
          index: index,
          isFocused: true,
          ...tab,
        });
        const newTabs = get().tabs;
        newTabs.set(newTab.id, newTab);
        return { tabs: newTabs, index, activeTab: newTab };
      });
    },
    updateTab: (id: string, update: Partial<ITab>) => {
      return set((state) => {
        const tabs = state.tabs;
        const tab = tabs.get(id);
        if (tab) {
          const updatedTab = { ...tab, ...update };
          tabs.set(id, new Tab(updatedTab));
        }
        return { tabs };
      });
    },
    deleteTab: (id: string) => {
      return set((state) => {
        const tabs = state.tabs;
        tabs.delete(id);
        return { tabs };
      });
    },
    closeTab: (id: string) => {
      return set((state) => {
        const tabs = state.tabs;
        const tab = tabs.get(id);
        if (tab) {
          const updatedTab = { ...tab, isFocused: false };
          tabs.set(id, new Tab(updatedTab));
        }
        return { tabs };
      });
    },
    selectTab: (id: string) => {
      return set((state) => {
        const tabs = state.tabs;
        const tab = tabs.get(id);
        if (tab) {
          const updatedTab = { ...tab, isFocused: true };
          tabs.set(id, new Tab(updatedTab));
          return { tabs, activeTab: updatedTab };
        }
        return { tabs };
      });
    },
  },
}));

export { useTabStore };
