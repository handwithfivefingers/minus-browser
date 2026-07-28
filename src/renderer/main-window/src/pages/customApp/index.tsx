import { IconInnerShadowTopLeft } from '@tabler/icons-react'
import { useEffect, useRef } from 'react'
import { Navigate, useParams } from 'react-router'

import { TabErrorPage } from '~/renderer/main-window/src/components/tab/TabErrorPage'
import { ITab } from '~/shared/types'

import { useContentView } from '../../hooks/useContentView'
import { Tab } from '../../interfaces'
import { debounce, navigateOrSearch } from '../../libs'
import { tabServices } from '../../services/tab.service'
import { useMinusThemeStore } from '../../stores/useMinusTheme'
import { useTabStore } from '../../stores/useTabStore'

const LAYOUT_HEADER_CLASS = {
  BASIC: 'h-full relative overflow-hidden w-full flex flex-col',
  FLOATING: 'h-[calc(100svh-8px)] rounded-md relative overflow-hidden w-full flex flex-col gap-1',
}
const WEBVIEW_CLASSES = {
  BASIC: 'h-[calc(100vh-34px)] relative overflow-hidden',
  FLOATING: 'h-[calc(100vh-46px)] rounded-md relative overflow-hidden',
}

const CustomApp = () => {
  const { customApp: tabId = '' } = useParams<{ customApp: string }>()
  const { layout } = useMinusThemeStore()
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId))
  const updateTab = useTabStore((s) => s.updateTab)
  const setActiveTab = useTabStore((s) => s.setActiveTab)

  const getScreenData = async () => {
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
  }, [tabId])

  const handleSearch = async (url: string) => {
    try {
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

  if (!tabId) return <Navigate to={'/'} />
  return (
    <div className={LAYOUT_HEADER_CLASS[layout as keyof typeof LAYOUT_HEADER_CLASS]}>
      {tab?.error ? (
        <TabErrorPage error={tab.error} onRetry={handleRetry} onGoHome={handleGoHome} />
      ) : (
        <WebViewInstance id={tabId} />
      )}
    </div>
  )
}

const WebViewInstance = ({ id }: { id: string }) => {
  const webviewRef = useRef<HTMLDivElement | null>(null)
  const { showViewByID } = useContentView()
  const { layout } = useMinusThemeStore()
  const getContentView = async (tab: Partial<Tab>) => {
    try {
      if (!webviewRef.current) return
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect()
      const screen = { x, y, width, height }
      const data = { screen, tab: tab }
      await showViewByID(data)
    } catch (error) {
      console.error('error', error)
    }
  }

  useEffect(() => {
    if (!webviewRef.current) return
    if (!id) return
    getContentView({ id })
    const autoSize = debounce(() => {
      if (!webviewRef.current) return
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect()
      window.api.EMIT('VIEW_RESPONSIVE', {
        tab: { id },
        screen: { x, y, width, height },
      })
    }, 25)
    const resizeObserver = new ResizeObserver(autoSize)
    resizeObserver?.observe(webviewRef.current)
    return () => {
      id && window.api.EMIT('HIDE_VIEW', { id })
      webviewRef.current && resizeObserver?.unobserve(webviewRef.current as Element)
    }
  }, [id])

  useEffect(() => {
    window.api.LISTENER('TOGGLE_DEV_TOOLS', () => {
      window.api.EMIT('TOGGLE_DEV_TOOLS', { id })
    })
  }, [])

  return (
    <div className={WEBVIEW_CLASSES[layout as keyof typeof WEBVIEW_CLASSES]}>
      <div
        className="absolute top-0 left-0 z-0 mx-auto mt-auto flex h-full w-full items-center justify-center bg-slate-200"
        ref={webviewRef}
      >
        <IconInnerShadowTopLeft className="animate-spin" />
      </div>
    </div>
  )
}

export default CustomApp
