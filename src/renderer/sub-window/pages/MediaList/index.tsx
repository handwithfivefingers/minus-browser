import { IconPictureInPicture, IconX } from '@tabler/icons-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { MediaTabEntry, MediaVideo } from '~/shared/types'

import { register } from '../../registry'

interface MediaListPayload {
  activeTabId?: string
  tabs?: MediaTabEntry[]
  anchor?: { x: number; y: number }
}

const formatTime = (seconds: number) => {
  if (!isFinite(seconds) || seconds <= 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function MediaList() {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | undefined>(undefined)
  const [tabs, setTabs] = useState<MediaTabEntry[]>([])
  const menuRef = useRef<HTMLDivElement>(null)

  const hide = useCallback(() => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('subWindowPayload')
    if (stored) {
      try {
        const payload: MediaListPayload = JSON.parse(stored)
        sessionStorage.removeItem('subWindowPayload')
        setAnchor(payload.anchor)
        if (Array.isArray(payload.tabs)) setTabs(payload.tabs)
      } catch {
        // ignore parse errors
      }
    }
    window.api.LISTENER(IPC_RENDERER_EVENT.MEDIA_LIST_UPDATED, (data?: MediaTabEntry[]) => {
      if (Array.isArray(data)) setTabs(data)
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hide()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [hide])

  const pip = useCallback(
    (tabId: string, video: MediaVideo) => {
      window.api.EMIT('REQUEST_PIP', { tab: { id: tabId }, videoIndex: video.id })
      hide()
    },
    [hide]
  )

  const left = Math.max(8, Math.min(anchor?.x ?? 16, window.innerWidth - 320))
  const top = Math.max(8, Math.min(anchor?.y ?? 16, window.innerHeight - 360))

  return (
    <div className="fixed inset-0">
      <div
        ref={menuRef}
        className="absolute z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        style={{ left, top, pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Media</span>
          <button
            type="button"
            className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            onClick={hide}
            title="Close"
          >
            <IconX size={14} />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {tabs.length === 0 ? (
            <p className="p-3 text-center text-xs text-slate-400 italic dark:text-slate-500">No media playing</p>
          ) : (
            tabs.map((tab) => (
              <div key={tab.tabId} className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {tab.favicon ? (
                    <img src={tab.favicon} alt="" className="h-3.5 w-3.5 rounded-sm" />
                  ) : (
                    <span className="h-3.5 w-3.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
                  )}
                  <span className="truncate">{tab.title}</span>
                </div>
                {tab.videos.map((video) => (
                  <button
                    type="button"
                    key={video.id}
                    className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                    onClick={() => pip(tab.tabId, video)}
                    title="Play in Picture-in-Picture"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-slate-700 group-hover:text-indigo-600 dark:text-slate-200 dark:group-hover:text-indigo-400">
                        {video.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatTime(video.currentTime)} / {formatTime(video.duration)}
                      </div>
                    </div>
                    <IconPictureInPicture size={16} className="shrink-0 text-indigo-500" />
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export const MediaListRegister = register({
  path: '/media-list',
  name: 'Media List',
  component: MediaList,
  shell: false,
})
