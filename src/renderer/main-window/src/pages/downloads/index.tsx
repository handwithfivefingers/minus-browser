import {
  IconDownload,
  IconEye,
  IconFolder,
  IconPlayerPause,
  IconPlayerPlay,
  IconTrash,
  IconTrashX,
  IconX,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useEffect } from 'react'

import { IPC_DOWNLOAD_INVOKE } from '~/shared/constants/ipc/download'
import { useDownloadStore } from '~/shared/store/useDownloadStore'
import { DownloadItem } from '~/shared/types/download'
import { formatBytes } from '~/shared/utils/download'
import { downloadService } from '../../services/download.service'

const Downloads = () => {
  const downloads = useDownloadStore((s) => s.downloads)

  useEffect(() => {
    downloadService.updatedItems().then((item) => {
      useDownloadStore.getState().upsert(item)
    })
    downloadService.subscribeItems().then((data) => {
      if (Array.isArray(data)) useDownloadStore.getState().setDownloads(data)
    })
    downloadService.getAll().then((data) => {
      if (Array.isArray(data)) useDownloadStore.getState().setDownloads(data)
    })
  }, [])

  const clearAll = async () => {
    await downloadService.clearAll()
    useDownloadStore.getState().clear()
  }

  return (
    <div className="flex h-full w-full flex-col gap-3 overflow-hidden bg-slate-50 p-4 dark:bg-slate-950">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IconDownload className="text-slate-700 dark:text-slate-300" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Downloads</h1>
        </div>
        {downloads.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <IconTrashX size={14} />
            Clear all
          </button>
        )}
      </div>

      <div className="scrollbar min-h-0 flex-1 overflow-y-auto">
        {downloads.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
            <IconDownload size={40} className="opacity-40" />
            <p className="text-sm">No downloads yet</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {downloads.map((item) => (
              <DownloadRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DownloadRow({ item }: { item: DownloadItem }) {
  const action = (invoke: (typeof IPC_DOWNLOAD_INVOKE)[keyof typeof IPC_DOWNLOAD_INVOKE]) =>
    window.api.INVOKE(invoke, { id: item.id })
  const active = item.state === 'progressing' || item.state === 'interrupted'
  const onRemove = async () => {
    await window.api.INVOKE(IPC_DOWNLOAD_INVOKE.REMOVE, { id: item.id })
    useDownloadStore.getState().remove(item.id)
  }

  const barClass =
    item.state === 'interrupted'
      ? 'bg-amber-500'
      : item.state === 'completed'
        ? 'bg-green-500'
        : item.paused
          ? 'bg-slate-400'
          : 'bg-indigo-500'

  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-200" title={item.filename}>
            {item.filename}
          </span>
          {item.state === 'completed' && (
            <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              Completed
            </span>
          )}
          {item.state === 'cancelled' && (
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              Cancelled
            </span>
          )}
          {item.state === 'interrupted' && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
              Interrupted
            </span>
          )}
          {item.state === 'progressing' && (
            <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400">
              {item.paused ? 'Paused' : 'Downloading'}
            </span>
          )}

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

        <p className="truncate text-xs text-slate-400 dark:text-slate-500" title={item.url}>
          {item.url}
        </p>

        <div className="flex items-center gap-2">
          {active && item.totalBytes > 0 && (
            <>
              <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-150',
                    item.state === 'interrupted' ? 'bg-amber-500' : item.paused ? 'bg-slate-400' : 'bg-indigo-500'
                  )}
                  style={{ width: `${Math.max(2, item.progress)}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 tabular-nums dark:text-slate-400">
                {item.progress}% · {formatBytes(item.receivedBytes)} / {formatBytes(item.totalBytes)}
              </span>
            </>
          )}
          {!active && item.state === 'completed' && (
            <span className="text-xs text-slate-400 tabular-nums">{formatBytes(item.totalBytes)}</span>
          )}
          {item.startedAt > 0 && (
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {new Date(item.startedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.state === 'progressing' && (
          <>
            <RowButton
              title={item.paused ? 'Resume' : 'Pause'}
              onClick={() => action(item.paused ? IPC_DOWNLOAD_INVOKE.RESUME : IPC_DOWNLOAD_INVOKE.PAUSE)}
            >
              {item.paused ? <IconPlayerPlay size={16} /> : <IconPlayerPause size={16} />}
            </RowButton>
            <RowButton title="Cancel download" onClick={() => action(IPC_DOWNLOAD_INVOKE.CANCEL)}>
              <IconX size={16} />
            </RowButton>
          </>
        )}
        {item.state === 'interrupted' && (
          <RowButton title="Resume download" onClick={() => action(IPC_DOWNLOAD_INVOKE.RESUME)}>
            <IconPlayerPlay size={16} />
          </RowButton>
        )}
        {(item.state === 'completed' || item.state === 'interrupted') && (
          <>
            <RowButton title="Open file" onClick={() => action(IPC_DOWNLOAD_INVOKE.OPEN)}>
              <IconEye size={16} />
            </RowButton>
            <RowButton title="Show in folder" onClick={() => action(IPC_DOWNLOAD_INVOKE.SHOW_IN_FOLDER)}>
              <IconFolder size={16} />
            </RowButton>
          </>
        )}
        <RowButton title="Remove from list" onClick={onRemove}>
          <IconTrash size={16} />
        </RowButton>
      </div>
    </div>
  )
}

function RowButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="cursor-pointer rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
    >
      {children}
    </button>
  )
}

export default Downloads
