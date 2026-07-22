import { IconClock, IconHistory, IconRefresh, IconSearch, IconTrash, IconX } from '@tabler/icons-react'
import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'

import { useMinusThemeStore } from '../../stores/useMinusTheme'

interface IHistoryEntry {
  id: string
  url: string
  title: string
  favicon: string
  timestamp: number
  visitCount: number
}

const CLASSES = {
  BASIC: 'bg-slate-50 dark:bg-slate-950 w-full h-full p-4',
  FLOATING: 'bg-slate-50 dark:bg-slate-950 w-full h-full rounded-xl p-4',
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(ts).toLocaleDateString()
}

function getDateGroup(ts: number): string {
  const now = new Date()
  const date = new Date(ts)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 6 * 86400000)

  if (date >= today) return 'Today'
  if (date >= yesterday) return 'Yesterday'
  if (date >= weekAgo) return 'Last 7 Days'
  return 'Older'
}

const History = () => {
  const { layout } = useMinusThemeStore()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<IHistoryEntry[]>([])
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const loadHistory = useCallback(async () => {
    const data = await window.api.INVOKE<IHistoryEntry[]>('GET_HISTORY')
    setEntries(data || [])
  }, [])

  useEffect(() => {
    loadHistory()
    const interval = setInterval(loadHistory, 3000)
    return () => clearInterval(interval)
  }, [loadHistory])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const openUrl = async (url: string) => {
    const tab = await window.api.INVOKE<{ id: string }>('CREATE_TAB', { url })
    if (tab?.id) navigate(`/${tab.id}`)
  }

  const deleteEntry = async (id: string) => {
    await window.api.INVOKE('DELETE_HISTORY', id)
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const clearAll = async () => {
    await window.api.INVOKE('CLEAR_HISTORY')
    setEntries([])
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter((e) => e.title.toLowerCase().includes(q) || e.url.toLowerCase().includes(q))
  }, [entries, search])

  const grouped = useMemo(() => {
    const groups: Record<string, IHistoryEntry[]> = {}
    for (const entry of filtered) {
      const group = getDateGroup(entry.timestamp)
      if (!groups[group]) groups[group] = []
      groups[group].push(entry)
    }
    return groups
  }, [filtered])

  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Older']

  return (
    <div className="relative h-full w-full bg-slate-100 dark:bg-slate-950">
      <div className={CLASSES[layout as keyof typeof CLASSES]}>
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <IconHistory size={20} className="text-slate-600 dark:text-slate-400" />
            <h1 className="flex-1 text-lg font-semibold text-slate-800 dark:text-slate-100">History</h1>
            <div className="relative w-full max-w-xs">
              <IconSearch
                size={16}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 dark:text-slate-500"
              />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search history..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-slate-50 py-1.5 pr-3 pl-9 text-sm focus:ring-2 focus:ring-indigo-400/50 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                >
                  <IconX size={14} />
                </button>
              )}
            </div>
            <button
              onClick={loadHistory}
              className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-200 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            >
              <IconRefresh size={14} />
            </button>
            {entries.length > 0 && (
              <button
                onClick={clearAll}
                className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
              >
                <IconTrash size={14} />
                Clear All
              </button>
            )}
          </div>

          <div className="scrollbar flex-1 overflow-auto p-4">
            {entries.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400 dark:text-slate-500">
                <IconClock size={48} />
                <p className="text-lg font-medium">No history yet</p>
                <p className="text-sm">Start browsing to see your history here</p>
              </div>
            ) : (
              groupOrder.map((group) => {
                const items = grouped[group]
                if (!items || items.length === 0) return null
                return (
                  <div key={group} className="mb-6">
                    <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
                      {group}
                    </h2>
                    <div className="space-y-0.5">
                      {items.map((entry) => (
                        <div
                          key={entry.id}
                          className="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-white dark:hover:bg-slate-800"
                          onClick={() => openUrl(entry.url)}
                        >
                          {entry.favicon ? (
                            <img src={entry.favicon} alt="" className="h-5 w-5 shrink-0 rounded" />
                          ) : (
                            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-300 text-xs text-slate-500 dark:bg-slate-600 dark:text-slate-400">
                              {entry.title.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">
                              {entry.title}
                            </div>
                            <div className="truncate text-xs text-slate-400 dark:text-slate-500">{entry.url}</div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {entry.visitCount > 1 && (
                              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-xs text-slate-400 dark:bg-slate-700 dark:text-slate-500">
                                {entry.visitCount}
                              </span>
                            )}
                            <span className="hidden text-xs text-slate-400 sm:inline dark:text-slate-500">
                              {formatRelativeTime(entry.timestamp)}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deleteEntry(entry.id)
                              }}
                              className="cursor-pointer p-1 text-red-500 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-700"
                            >
                              <IconTrash size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default History
