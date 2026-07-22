import { useEffect, useRef, useState } from 'react'

import { ITab } from '~/shared/types'

import { Tab } from '../interfaces'
import { navigateOrSearch } from '../libs'
import { tabServices } from '../services/tab.service'
import { useTabStore } from '../stores/useTabStore'

export const useTabEvents = (tabId?: string) => {
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId))
  const updateTab = useTabStore((s) => s.updateTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)
  const [loading, setLoading] = useState(false)

  const onReload = async () => {
    try {
      window.api.EMIT('ON_RELOAD', tab)
    } catch (error) {
      console.error('onToggleDevTools error', error)
    }
  }

  const onTabNavigate = (isLoading: boolean) => {
    setLoading(isLoading)
  }

  const handleSearch = async (url: string) => {
    try {
      if (!tabId) return
      const outputFormat = navigateOrSearch(url)
      updateTab(tabId, { url: outputFormat, error: null })
      window.api.EMIT('VIEW_CHANGE_URL', { id: tabId, url: outputFormat })
    } catch (error) {
      console.error('VIEW_CHANGE_URL error', error)
    }
  }

  const handleRetry = async () => {
    if (!tab?.error?.url) return
    await handleSearch(tab.error.url)
  }

  const handleGoHome = async () => {
    await handleSearch('https://google.com')
  }

  const onBackWard = async () => {
    try {
      return window.api.EMIT('ON_BACKWARD', { data: tab })
    } catch (error) {
      console.error('onBackWard error', error)
    }
  }

  const onToggleDevTools = async () => {
    try {
      window.api.EMIT('TOGGLE_DEV_TOOLS', { id: tabId })
    } catch (error) {
      console.error('onToggleDevTools error', error)
    }
  }

  const onRequestPIP = async () => {
    window.api.EMIT('REQUEST_PIP', { tab })
  }

  const getScreenData = async () => {
    if (!tabId) return
    const tab = await window.api.INVOKE<Tab>('GET_TAB', { id: tabId })
    updateTab(tabId, tab)
  }

  useEffect(() => {
    if (!tabId) return
    setActiveTab(tabId)
    getScreenData()
    tabServices.subscribeTab<ITab>(tabId, (tab) => {
      updateTab(tabId, tab)
    })
    window.api.LISTENER(`LOADING:${tabId}`, onTabNavigate)
  }, [tabId])

  return {
    tab,
    onReload,
    onTabNavigate,
    updateTab,
    loading,
    handleSearch,
    handleRetry,
    handleGoHome,
    onBackWard,
    onToggleDevTools,
    onRequestPIP,
  }
}
