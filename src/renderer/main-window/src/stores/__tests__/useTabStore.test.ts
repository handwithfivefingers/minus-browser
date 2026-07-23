import { describe, it, expect, beforeEach } from 'vitest'

import { useTabStore } from '~/renderer/main-window/src/stores/useTabStore'

describe('useTabStore', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTab: null, index: 0 })
  })

  it('sets tabs', () => {
    const tab = { id: '1', title: 'Test', url: 'https://example.com', index: 0, isPinned: false, isFocused: true }
    useTabStore.getState().setTabs([tab as any])
    const state = useTabStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].title).toBe('Test')
  })

  it('updates a tab by id', () => {
    useTabStore
      .getState()
      .setTabs([{ id: '1', title: 'Tab 1', url: 'https://a.com', index: 0, isPinned: false, isFocused: false } as any])
    useTabStore.getState().updateTab('1', { title: 'Updated' })
    expect(useTabStore.getState().tabs[0].title).toBe('Updated')
  })

  it('updates activeTab when the updated tab is the active one', () => {
    useTabStore
      .getState()
      .setTabs([{ id: '1', title: 'Tab 1', url: 'https://a.com', index: 0, isPinned: false, isFocused: false } as any])
    useTabStore.getState().setActiveTab('1')
    useTabStore.getState().updateTab('1', { title: 'Updated' })
    expect(useTabStore.getState().activeTab?.title).toBe('Updated')
  })

  it('sets active tab', () => {
    useTabStore
      .getState()
      .setTabs([
        { id: '1', title: 'A', url: 'https://a.com', index: 0, isPinned: false, isFocused: false } as any,
        { id: '2', title: 'B', url: 'https://b.com', index: 1, isPinned: false, isFocused: false } as any,
      ])
    useTabStore.getState().setActiveTab('2')
    expect(useTabStore.getState().activeTab?.id).toBe('2')
  })

  it('does not set active tab for non-existent id', () => {
    useTabStore.getState().setActiveTab('nonexistent')
    expect(useTabStore.getState().activeTab).toBeNull()
  })

  it('does not update non-existent tab', () => {
    useTabStore.getState().updateTab('ghost', { title: 'Ghost' })
    expect(useTabStore.getState().tabs).toHaveLength(0)
  })
})
