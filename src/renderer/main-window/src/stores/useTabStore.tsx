import { create } from 'zustand'

import { TabStore, Tab } from '~/renderer/main-window/src/interfaces'

const useTabStore = create<TabStore>((set, get) => ({
  tabs: [],
  activeTab: null,
  index: 0,

  setTabs: (tabs: Tab[]) => set((state) => ({ ...state, tabs: tabs })),
  updateTab: (tabId: string, tab: Partial<Tab>) => {
    return set((state) => {
      const index = state.tabs.findIndex((item) => item.id === tabId)
      if (index === -1) return state
      const tabs = state.tabs.map((item) => (item.id === tabId ? { ...item, ...tab } : item))
      const activeTab = state.activeTab?.id === tabId ? { ...state.activeTab, ...tab } : state.activeTab
      return { ...state, tabs, activeTab }
    })
  },
  setActiveTab: (tabId: string) =>
    set((state) => {
      const target = state.tabs.find((item) => item.id === tabId)
      if (!target) return state
      return { ...state, activeTab: target }
    }),
  sync: () => {
    try {
      const tabs = get().tabs.filter((item) => !!item)
      window.api.INVOKE('CLOUD_SAVE', { data: tabs })
      return
    } catch (error) {
      console.error('Syncing tabs Error:', error)
    }
  },
}))

export { useTabStore }
