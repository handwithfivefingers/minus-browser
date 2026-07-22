import { useEffect, useLayoutEffect } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Outlet, useNavigate, useParams } from 'react-router'

import { IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { useWebNotificationStore } from '~/shared/store/useNotificationStore'
import { IUserInterface } from '~/shared/types'

import { AiSidebar, NotificationContainer, SideMenu, UpdateBanner } from '../components'
import Header from '../components/header'
import { useAiSidebarStore } from '../features/aiSider/stores/useAiSidebarStore'
import { useTabEvents } from '../hooks/useTabEvents'
import { useTranslation } from '../hooks/useTranslation'
import { useUserScript } from '../hooks/useUserScript'
import { useVault } from '../hooks/useVault'
import { tabServices } from '../services/tab.service'
import { useMinusThemeStore } from '../stores/useMinusTheme'
import { useTabStore } from '../stores/useTabStore'
import { setupUpdateListener } from '../stores/useUpdateStore'

const LAYOUT_CLASS = {
  BASIC: 'flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950',
  FLOATING: 'flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950 p-1 gap-1',
}
const Layout = () => {
  const layout = useMinusThemeStore().layout || 'FLOATING'
  const { setTabs } = useTabStore()
  const navigate = useNavigate()
  const { customApp: tabId } = useParams()
  const tabEvent = useTabEvents(tabId || '')
  const translate = useTranslation(tabEvent?.tab)
  const vault = useVault(tabEvent?.tab)
  const userScript = useUserScript(tabEvent?.tab)
  useEffect(() => {
    const timeout = setInterval(async () => {
      const tabs = await tabServices.getTabs()
      if (tabs?.length) {
        setTabs?.(tabs)
        if (timeout) clearInterval(timeout)
      }
    }, 1000)

    window.api.LISTENER('GET_TABS', (v) => {
      if (timeout) clearInterval(timeout)
      setTabs(v)
    })

    return () => {
      if (timeout) clearInterval(timeout)
    }
  }, [])

  useEffect(() => {
    setupUpdateListener()
    window.api.LISTENER('OPEN_TAB_BY_ID', (payload?: { id?: string }) => {
      if (payload?.id) {
        navigate(`/${payload.id}`)
      }
    })
    window.api.LISTENER('NAVIGATE_HISTORY', () => {
      navigate('/history')
    })
    window.api.LISTENER('NAVIGATE_SETTINGS', () => {
      navigate('/setting')
    })
    window.api.LISTENER('TOGGLE_AI_SIDEBAR', () => {
      useAiSidebarStore.getState().toggle()
    })
    window.api.LISTENER('NOTIFICATION_POPUP', (data?: any) => {
      if (data) {
        useWebNotificationStore.getState().addNotification(data)
      }
    })
    window.api.LISTENER('NOTIFICATION_STATE_SYNC', (data?: { notifications: any[]; unreadCount: number }) => {
      if (data) {
        useWebNotificationStore.setState({
          notifications: data.notifications,
          unreadCount: data.unreadCount,
        })
      }
    })
  }, [])

  useEffect(() => {
    window.api.LISTENER('CAPTURE_PAGE', () => {
      window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_PAGE)
    })
    window.api.LISTENER(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION, () => {
      window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION)
    })
    window.api.LISTENER(IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE, (payload?: { text?: string; action?: string }) => {
      const text = payload?.text?.trim()
      if (!text) return
      const action = payload?.action || 'explain'
      const modeMap: Record<string, 'chat' | 'summarize' | 'explain'> = {
        chat: 'chat',
        summarize: 'summarize',
        explain: 'explain',
      }
      useAiSidebarStore.getState().setPendingText(text)
      useAiSidebarStore.getState().setMode(modeMap[action] || 'explain')
      useAiSidebarStore.getState().open()
    })
  }, [])

  return (
    <LayoutSideEffect>
      <div className="flex h-screen flex-col">
        <Header
          key={tabId}
          id={tabId || ''}
          title={tabEvent?.tab?.title}
          url={tabEvent?.tab?.url}
          onSearch={tabEvent?.handleSearch}
          onBackWard={tabEvent?.onBackWard}
          onToggleDevTools={tabEvent?.onToggleDevTools}
          onReload={tabEvent?.onReload}
          onRequestPIP={tabEvent?.onRequestPIP}
          onOpenVaultManager={vault.onOpenVaultManager}
          onOpenUserscriptManager={userScript?.onOpenUserscriptManager}
          onTranslatePage={translate?.onTranslatePage}
          onOpenTranslateManager={translate?.onOpenTranslateManager}
          onOpenSpotlight={(query) => window.api.EMIT('SPOTLIGHT_OPEN', { query, activeTabId: tabId })}
          isLoading={tabEvent?.loading}
          preventHibernate={tabEvent?.tab?.preventHibernate}
          onTogglePreventHibernate={() => window.api.INVOKE('TOGGLE_PREVENT_HIBERNATE', { id: tabId })}
          onCapturePage={() => window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_PAGE)}
        />
        <NotificationContainer />
        <UpdateBanner />
        <div className={LAYOUT_CLASS[layout as keyof typeof LAYOUT_CLASS]}>
          <SideMenu />
          <div className="h-full w-full overflow-auto">
            <ErrorBoundary fallback={<p>⚠️Something went wrong</p>}>
              <Outlet context={tabEvent} />
            </ErrorBoundary>
          </div>
          <AiSidebar />
        </div>
      </div>
    </LayoutSideEffect>
  )
}

const LayoutSideEffect = ({ children }: { children: React.ReactElement | React.ReactNode }): React.ReactElement => {
  const minus = useMinusThemeStore()
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        const theme: IUserInterface = await window.api.INVOKE('GET_USER_INTERFACE')
        if (theme) minus.initialize(theme)
      } catch (error) {
        console.error('Error getting tabs:', error)
      }
    }
    getScreenData()
  }, [])

  return children as React.ReactElement
}

export default Layout
