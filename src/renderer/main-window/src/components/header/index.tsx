import {
  IconBrain,
  IconCamera,
  IconChevronLeft,
  IconCode,
  IconCodeDots,
  IconKey,
  IconLanguage,
  IconLock,
  IconPictureInPicture,
  IconReload,
  IconSearch,
  IconShieldCancel,
  IconSnowflake,
  IconX,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useCallback, useEffect, useState } from 'react'

import { useAiSidebarStore } from '../../features/aiSider/stores/useAiSidebarStore'
import { useMinusThemeStore } from '../../stores/useMinusTheme'

// @ts-ignore
import styles from './styles.module.css'
interface IHeader {
  url?: string
  id: string
  onSearch: (v: string) => void
  onBackWard: () => void
  onToggleDevTools: () => void
  onReload: () => void
  onRequestPIP: () => void
  // onFillPassword: () => void;
  onOpenVaultManager: () => void
  onOpenUserscriptManager: () => void
  onTranslatePage: () => void
  onOpenTranslateManager: () => void
  onOpenSpotlight: (query?: string) => void
  onCapturePage?: () => void
  title?: string
  isLoading: boolean
  isBookmarked?: boolean
  preventHibernate?: boolean
  onTogglePreventHibernate?: () => void
}

const LAYOUT_HEADER_CLASS = {
  BASE: 'flex gap-2 border-b border-slate-200 dark:border-slate-700 px-2 py-1 bg-slate-100 dark:bg-slate-900 w-full relative',
  BASIC: '',
  FLOATING: ' rounded-lg',
}

const Header = ({
  title,
  id,
  isLoading,
  url,
  preventHibernate,
  onBackWard,
  onToggleDevTools,
  onReload,
  onRequestPIP,
  onOpenVaultManager,
  onOpenUserscriptManager,
  onTranslatePage,
  onOpenTranslateManager,
  onOpenSpotlight,
  onCapturePage,
  onTogglePreventHibernate,
}: IHeader) => {
  const { layout, extension } = useMinusThemeStore()
  const [stats, setStats] = useState<{ blockedRequests: number } | null>(null)

  useEffect(() => {
    ;(async () => {
      const s = await (window.api.INVOKE as any)('@adb/get-stats')
      setStats(s)
    })()
  }, [])

  const openSiteInfo = (e: React.MouseEvent) => {
    if (!url) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    window.api.INVOKE('OPEN_SITE_INFO', {
      url,
      anchor: { x: rect.left, y: rect.bottom, width: rect.width, height: rect.height },
    })
  }

  const openSpotlight = () => {
    onOpenSpotlight(url || '')
  }
  const onClose = useCallback(() => {
    window.api.EMIT('CLOSE_APP')
  }, [])

  // if (!id) return null;
  return (
    <div
      className={clsx(LAYOUT_HEADER_CLASS.BASE, LAYOUT_HEADER_CLASS[layout as keyof typeof LAYOUT_HEADER_CLASS])}
      id="searchBar"
    >
      <div className={clsx('relative z-2 flex h-8 min-w-8 items-center gap-0.5 pb-2')}>
        <button
          className="h-3 w-3 cursor-pointer rounded-full bg-red-600/50 text-transparent hover:bg-red-600 hover:text-white"
          onClick={onClose}
        >
          <IconX size={12} />
        </button>
      </div>
      <div className={clsx(styles.appbar, 'w-full flex-1')} />
      {id && (
        <div className="relative z-2 flex items-center gap-2 rounded border-slate-300 px-2 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
          <button
            className="cursor-pointer rounded p-1 hover:bg-indigo-500 hover:text-white"
            onClick={onBackWard}
            title="Go back"
          >
            <IconChevronLeft size={16} />
          </button>
        </div>
      )}
      {id && (
        <>
          <div className={clsx(styles.appbar, 'w-full flex-1')} />

          <div className="relative z-2 flex items-center">
            <button
              onClick={onTogglePreventHibernate}
              className={clsx(
                'cursor-pointer rounded-full p-1.5 transition-all',
                preventHibernate
                  ? 'bg-cyan-500 text-white shadow-sm shadow-cyan-400 hover:shadow-md hover:shadow-cyan-400'
                  : 'text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300'
              )}
              title={
                preventHibernate
                  ? 'Hibernation disabled — this tab will stay alive regardless of inactivity'
                  : 'Hibernation allowed — tab will auto-hibernate when idle'
              }
            >
              <IconSnowflake size={14} />
            </button>
            <button
              onClick={onReload}
              className={clsx(
                'h-[calc(100%-4px)] cursor-pointer rounded-full px-2 py-1 text-indigo-500 transition-all hover:bg-indigo-500 hover:text-white active:translate-y-0.5',
                {
                  'animate-spin': isLoading,
                }
              )}
            >
              <IconReload size={12} />
            </button>
          </div>
          <div className={clsx(styles.appbar, 'w-full flex-1')} />
        </>
      )}

      <div
        className={
          'relative  z-2 mx-auto flex w-1/2 items-center gap-1 rounded-full border-2 border-transparent bg-white px-1 transition-all dark:bg-slate-800'
        }
      >
        <div className="flex items-center gap-px">
          <button
            type="button"
            onClick={openSiteInfo}
            className="cursor-pointer rounded-full p-1 text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-500"
            title="Site information"
          >
            <IconLock size={12} />
          </button>
          <button
            className="h-[calc(100%-4px)] cursor-pointer rounded-full p-1 text-indigo-500 transition-all hover:bg-indigo-500 hover:text-white active:translate-y-0.5"
            onClick={onTranslatePage}
            title="Translate page"
          >
            <IconLanguage size={12} />
          </button>
        </div>
        <div className="flex w-full items-center gap-1 overflow-hidden rounded-full">
          <input
            className="w-full cursor-pointer bg-white py-1 text-xs outline outline-transparent transition-all dark:bg-slate-800 dark:text-slate-200"
            value={title || ''}
            onMouseDown={(event) => {
              event.preventDefault()
              openSpotlight()
            }}
            placeholder="Ctrl + K"
            title={title || url || ''}
            readOnly
          />
        </div>
        <button
          className="h-[calc(100%-4px)] cursor-pointer rounded-full px-1  py-1 text-indigo-500 transition-all hover:bg-indigo-500/50 hover:text-white active:translate-y-0.5"
          onClick={openSpotlight}
          title="Search"
        >
          <IconSearch size={12} />
        </button>
      </div>
      <div className={clsx(styles.appbar, 'w-full flex-1')} />

      {id && (
        <div
          className={clsx(
            'relative z-2 flex items-center gap-2 rounded-full border-slate-300 bg-slate-200 px-2 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
            // {
            //   ["opacity-0 invisible"]: !id,
            // },
          )}
        >
          <button
            className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
            onClick={onRequestPIP}
            title="Picture in picture"
          >
            <IconPictureInPicture size={16} />
          </button>
          <button
            className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
            onClick={onToggleDevTools}
            title="Dev tools"
          >
            <IconCode size={16} />
          </button>

          <button
            className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
            onClick={onCapturePage}
            title="Capture Page"
          >
            <IconCamera size={16} />
          </button>

          {extension.vault ? (
            <button
              className="cursor-pointer rounded p-1 text-[10px] font-semibold transition-all hover:bg-indigo-500 hover:text-white"
              onClick={onOpenVaultManager}
              title="Open Vault Manager"
            >
              <IconKey size={16} />
            </button>
          ) : (
            ''
          )}

          {extension.translate ? (
            <button
              className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
              onClick={onOpenTranslateManager}
              title="Open Translate Manager"
            >
              <IconLanguage size={16} />
            </button>
          ) : (
            ''
          )}
          {extension.userscript ? (
            <button
              className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
              onClick={onOpenUserscriptManager}
              title="Open Tampermonkey Manager"
            >
              <IconCodeDots size={16} />
            </button>
          ) : (
            ''
          )}

          <button
            className="cursor-pointer rounded p-1 transition-all hover:bg-indigo-500 hover:text-white"
            onClick={() => useAiSidebarStore.getState().toggle()}
            title="AI Sidebar"
          >
            <IconBrain size={16} />
          </button>

          <div className="flex items-center gap-0.5 text-xs text-green-600">
            <IconShieldCancel size={16} />
            {stats?.blockedRequests}
          </div>
        </div>
      )}
    </div>
  )
}

export default Header
