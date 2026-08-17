import { IconDownload, IconEye, IconFolder, IconPlayerPause, IconPlayerPlay, IconX } from '@tabler/icons-react'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef } from 'react'

import { IPC_DOWNLOAD_EMIT, IPC_DOWNLOAD_INVOKE } from '~/shared/constants/ipc/download'
import { useDownloadStore } from '~/shared/store/useDownloadStore'
import { DownloadItem } from '~/shared/types/download'
import { formatBytes } from '~/shared/utils/download'

import { downloadService } from '~/renderer/main-window/src/services/download.service'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { register } from '../../registry'

const isActive = (d: DownloadItem) => d.state === 'progressing' || d.state === 'interrupted'

/** Download popup shown in the bounded popup view (loaded at `#/downloads`). */
export function DownloadShelf() {
  const downloads = useDownloadStore((s) => s.downloads)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onItemUpdated = (item: DownloadItem) => {
      useDownloadStore.getState().upsert(item)
    }
    const onListChanged = (data: DownloadItem[]) => useDownloadStore.getState().setDownloads(data)
    downloadService.updatedItems().then(onItemUpdated)
    downloadService.subscribeItems().then(onListChanged)
    downloadService.getAll().then((data) => {
      if (Array.isArray(data)) useDownloadStore.getState().setDownloads(data)
    })
  }, [])

  const items = useMemo(() => downloads.slice(0, 5), [downloads])
  const left = Math.max(8, Math.min(16, window.innerWidth - 320))
  const top = Math.max(8, Math.min(16, window.innerHeight - 360))

  const hide = useCallback(() => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed inset-0">
      <span
        className="absolute top-0 left-0 z-49 h-full w-full bg-slate-900/5 "
        onClick={() => window.api.EMIT(IPC_DOWNLOAD_EMIT.POPUP_DISMISS)}
        aria-hidden
      />
      <div
        ref={menuRef}
        className="absolute z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        style={{ right: 16, top, pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-700">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Media</span>
          <button
            type="button"
            className="cursor-pointer rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            onClick={() => window.api.EMIT(IPC_DOWNLOAD_EMIT.POPUP_DISMISS)}
            title="Close"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 ? (
            <p className="p-3 text-center text-xs text-slate-400 italic dark:text-slate-500">No files downloading</p>
          ) : (
            items.map((item) => <ShelfChip key={item.id} item={item} />)
          )}

          <div className="flex justify-end px-2 py-2">
            <button
              type="button"
              onClick={() => window.api.EMIT(IPC_DOWNLOAD_EMIT.NAVIGATE_ALL)}
              className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
              title="Show all downloads"
            >
              Show all
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ShelfChip({ item }: { item: DownloadItem }) {
  const active = isActive(item)
  const interrupted = item.state === 'interrupted'
  const action = (invoke: (typeof IPC_DOWNLOAD_INVOKE)[keyof typeof IPC_DOWNLOAD_INVOKE]) =>
    window.api.INVOKE(invoke, { id: item.id })

  const barClass = interrupted
    ? 'bg-amber-500'
    : item.state === 'completed'
      ? 'bg-green-500'
      : item.paused
        ? 'bg-slate-400'
        : 'bg-indigo-500'

  const showActions = active || item.state === 'completed'

  return (
    <div
      className="group relative flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
      title={item.filename}
    >
      <div
        className={clsx(
          'flex h-6 w-6 items-center justify-center rounded-lg',
          interrupted
            ? 'bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400'
            : item.state === 'completed'
              ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'
        )}
      >
        <IconDownload size={18} />
      </div>

      {/* progress below the icon */}
      <div className="flex w-full items-center gap-1">
        {item.totalBytes > 0 ? (
          <>
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className={clsx('h-full rounded-full transition-all duration-150', barClass)}
                style={{ width: `${Math.max(2, item.progress)}%` }}
              />
            </div>
            <span className="text-[9px] leading-none text-slate-400 tabular-nums">{item.progress}%</span>
          </>
        ) : (
          <span className="w-full text-center text-[9px] leading-none text-slate-400 tabular-nums">
            {formatBytes(item.receivedBytes)}
          </span>
        )}
      </div>

      <span className="w-full truncate text-center text-[10px] font-medium text-slate-600 dark:text-slate-300">
        {item.filename}
      </span>

      {showActions && (
        <div className="absolute -top-2 right-1 flex items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 opacity-0 shadow transition-opacity group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-700">
          {item.state === 'progressing' && (
            <ChipButton
              title={item.paused ? 'Resume' : 'Pause'}
              onClick={() => action(item.paused ? IPC_DOWNLOAD_INVOKE.RESUME : IPC_DOWNLOAD_INVOKE.PAUSE)}
            >
              {item.paused ? <IconPlayerPlay size={11} /> : <IconPlayerPause size={11} />}
            </ChipButton>
          )}
          {item.state === 'interrupted' && (
            <ChipButton title="Resume download" onClick={() => action(IPC_DOWNLOAD_INVOKE.RESUME)}>
              <IconPlayerPlay size={11} />
            </ChipButton>
          )}
          {active && (
            <ChipButton title="Cancel download" onClick={() => action(IPC_DOWNLOAD_INVOKE.CANCEL)}>
              <IconX size={11} />
            </ChipButton>
          )}
          {(item.state === 'completed' || item.state === 'interrupted') && (
            <>
              <ChipButton title="Open file" onClick={() => action(IPC_DOWNLOAD_INVOKE.OPEN)}>
                <IconEye size={11} />
              </ChipButton>
              <ChipButton title="Show in folder" onClick={() => action(IPC_DOWNLOAD_INVOKE.SHOW_IN_FOLDER)}>
                <IconFolder size={11} />
              </ChipButton>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function ChipButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="cursor-pointer rounded p-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 dark:hover:text-white"
    >
      {children}
    </button>
  )
}

export const DownloadShelfRegister = register({
  path: '/downloads',
  name: 'Downloads',
  shell: false,
  component: DownloadShelf,
})
