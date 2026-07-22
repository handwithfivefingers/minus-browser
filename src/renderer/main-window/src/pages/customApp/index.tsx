import { IconInnerShadowTopLeft } from '@tabler/icons-react'
import { lazy, useEffect, useRef } from 'react'
import { Navigate, useOutletContext, useParams } from 'react-router'

import { TabErrorPage } from '~/renderer/main-window/src/components/tab/TabErrorPage'

import { useContentView } from '../../hooks/useContentView'
import { useTabEvents } from '../../hooks/useTabEvents'
import { Tab } from '../../interfaces'
import { debounce } from '../../libs'
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
  const tab = useTabStore((s) => s.tabs.find((t) => t.id === tabId)) || ({} as Tab)
  const outletContext = useOutletContext<ReturnType<typeof useTabEvents>>()
  if (!tabId) return <Navigate to={'/'} />
  return (
    <div className={LAYOUT_HEADER_CLASS[layout as keyof typeof LAYOUT_HEADER_CLASS]}>
      {tab?.error ? (
        <TabErrorPage error={tab.error} onRetry={outletContext?.handleRetry} onGoHome={outletContext?.handleGoHome} />
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
