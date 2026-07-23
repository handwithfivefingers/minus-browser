import {
  IconChevronDown,
  IconChevronRight,
  IconClock,
  IconCode,
  IconDatabase,
  IconDeviceFloppy,
  IconPuzzle,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { Switch } from '~/renderer/main-window/src/components'
import { useMinusThemeStore } from '~/renderer/main-window/src/stores/useMinusTheme'

import { cn } from '../../../libs/cn'

interface FilterEntry {
  key: string
  url: string
  name: string
  group: string
}

const toggleFilter = (current: string[], key: string): string[] => {
  const set = new Set(current)
  if (set.has(key)) {
    set.delete(key)
  } else {
    set.add(key)
  }
  return [...set]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatTimestamp(ts: number): string {
  if (!ts) return 'Never'
  const d = new Date(ts)
  return d.toLocaleString()
}

export const Extension = () => {
  const { extension, setExtension, saved } = useMinusThemeStore()
  const {
    adblock,
    translate,
    vault,
    userscript,
    cosmeticFiltering,
    disabledFilters,
    customFilters,
    adblockAutoUpdate,
    adblockAutoUpdateInterval,
  } = extension
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterEntry[]>([])
  const [filterSearch, setFilterSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})
  const [cacheInfo, setCacheInfo] = useState<{ size: number; timestamp: number; filterCount: number } | null>(null)
  const [stats, setStats] = useState<{ blockedRequests: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [customFilterText, setCustomFilterText] = useState('')
  useEffect(() => {
    ;(async () => {
      const list: FilterEntry[] = await (window.api.INVOKE as any)('@adb/get-filter-metadata')
      setFilters(list)
      const info = await (window.api.INVOKE as any)('@adb/get-cache-info')
      setCacheInfo(info)
      const s = await (window.api.INVOKE as any)('@adb/get-stats')
      setStats(s)
      const custom: string[] = await (window.api.INVOKE as any)('@adb/get-custom-filters')
      setCustomFilterText(custom?.join('\n'))
    })()
  }, [])

  async function handleClearCache() {
    setIsLoading(true)
    await (window.api.INVOKE as any)('@adb/clear-cache')
    const info = await (window.api.INVOKE as any)('@adb/get-cache-info')
    setCacheInfo(info)
    setIsLoading(false)
  }

  async function handleForceUpdate() {
    setIsLoading(true)
    await (window.api.INVOKE as any)('@adb/clear-cache')
    const info = await (window.api.INVOKE as any)('@adb/get-cache-info')
    setCacheInfo(info)
    setIsLoading(false)
  }

  async function handleSaveCustomFilters() {
    const lines = customFilterText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('!'))
    await (window.api.INVOKE as any)('@adb/set-custom-filters', lines)
  }

  function toggleGroup(group: string) {
    setExpandedGroups((prev) => ({ ...prev, [group]: prev[group] === undefined ? false : !prev[group] }))
  }
  function onToggleGroupFilter(isChecked: boolean, groupItems: FilterEntry[]) {
    const result = new Set(disabledFilters)
    for (const item of groupItems) {
      if (!isChecked) {
        result.add(item.key)
      } else {
        result.delete(item.key)
      }
    }
    setExtension({ ...extension, disabledFilters: Array.from(result) })
  }

  const filteredList = filterSearch
    ? filters.filter((f) => f.name.toLowerCase().includes(filterSearch.toLowerCase()))
    : filters

  const groupedFilters = filteredList.reduce<Record<string, FilterEntry[]>>((acc, f) => {
    const group = f.group || 'Other'
    if (!acc[group]) acc[group] = []
    acc[group].push(f)
    return acc
  }, {})

  const sortedGroups = Object.entries(groupedFilters).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        <IconPuzzle size={18} className="text-slate-700 dark:text-slate-300" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Extension Management</h2>
      </div>

      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400">Translate</span>
          <Switch value={translate} onCheck={(v) => setExtension({ ...extension, translate: v })} />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400">Vault</span>
          <Switch value={vault} onCheck={(v) => setExtension({ ...extension, vault: v })} />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400">UserScript</span>
          <Switch value={userscript} onCheck={(v) => setExtension({ ...extension, userscript: v })} />
        </div>
      </div>
      <div className=" flex flex-col gap-2 p-2 ">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium text-slate-500 dark:text-slate-400">Adblock</span>
          <Switch value={adblock} onCheck={(v) => setExtension({ ...extension, adblock: v })} />
        </div>
        {adblock && (
          <div className="flex w-full items-center justify-between gap-2 pl-4">
            <span className="w-36 text-sm text-slate-500 dark:text-slate-400">Cosmetic Filtering</span>
            <Switch value={cosmeticFiltering} onCheck={(v) => setExtension({ ...extension, cosmeticFiltering: v })} />
          </div>
        )}

        {adblock && (
          <div className="flex flex-col gap-4 rounded border border-slate-200 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-800/50">
            {/* Stats */}
            {stats && (
              <div className="grid max-w-xs grid-cols-2 gap-3">
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <div className="text-xs font-medium text-blue-600">Blocked Requests</div>
                  <div className="text-xl font-bold text-blue-800">{stats.blockedRequests}</div>
                </div>
              </div>
            )}

            {/* Cache */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <IconDatabase size={14} />
                <span className="font-medium">Filter Cache</span>
              </div>
              {cacheInfo && (
                <div className="mb-2 space-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                  <div>Size: {formatBytes(cacheInfo.size)}</div>
                  <div>Last Updated: {formatTimestamp(cacheInfo.timestamp)}</div>
                  <div>Filter Lists: {cacheInfo.filterCount}</div>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClearCache}
                  disabled={isLoading}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <IconTrash size={12} />
                  Clear Cache
                </button>
                <button
                  type="button"
                  onClick={handleForceUpdate}
                  disabled={isLoading}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  <IconRefresh size={12} />
                  Force Update
                </button>
              </div>
              <div className="w-full flex-col">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <IconClock size={14} />
                    <span className="font-medium">Auto Update</span>
                  </div>
                  <Switch
                    label="Auto Update"
                    value={adblockAutoUpdate}
                    onCheck={(v) => setExtension({ ...extension, adblockAutoUpdate: v })}
                  />
                </div>
                {adblockAutoUpdate && (
                  <div className="flex flex-col gap-2 rounded bg-slate-100 p-2 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <span className="w-32 text-sm text-slate-500 dark:text-slate-400">Interval</span>
                      <select
                        value={adblockAutoUpdateInterval}
                        onChange={(e) =>
                          setExtension({ ...extension, adblockAutoUpdateInterval: Number(e.target.value) })
                        }
                        className="flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                      >
                        <option value={60}>1 hour</option>
                        <option value={180}>3 hours</option>
                        <option value={360}>6 hours</option>
                        <option value={720}>12 hours</option>
                        <option value={1440}>24 hours</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Filter Lists */}
            <div className="flex flex-col gap-2">
              <div
                role="button"
                tabIndex={0}
                className="flex cursor-pointer items-center gap-2 py-1 text-sm text-slate-600 select-none dark:text-slate-400"
                onClick={() => setShowFilters(!showFilters)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setShowFilters(!showFilters)
                  }
                }}
              >
                {showFilters ? (
                  <IconChevronDown size={20} className="text-slate-500 dark:text-slate-400" />
                ) : (
                  <IconChevronRight size={20} className="text-slate-500 dark:text-slate-400" />
                )}
                <span className="font-medium text-slate-700 dark:text-slate-300">Filter Lists ({filters.length})</span>
              </div>

              {showFilters && (
                <div className="flex flex-col overflow-hidden rounded border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800/50">
                  <div className="sticky top-0 z-10 bg-slate-100 p-2 pb-1 dark:bg-slate-800/50">
                    <input
                      type="text"
                      placeholder="Search filters..."
                      value={filterSearch}
                      onChange={(e) => setFilterSearch(e.target.value)}
                      className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                    />
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {sortedGroups.map(([group, items]) => {
                      const isExpanded = expandedGroups[group] !== false
                      return (
                        <div key={group} className="border-b border-slate-200 last:border-b-0 dark:border-slate-700">
                          <div className="flex items-center justify-between bg-slate-100 pr-2 hover:bg-slate-200 dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700">
                            <div
                              role="button"
                              tabIndex={0}
                              className="sticky top-0 flex flex-1 cursor-pointer items-center gap-1.5  px-3 py-2 text-xs font-medium text-slate-600 select-none"
                              onClick={() => toggleGroup(group)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault()
                                  toggleGroup(group)
                                }
                              }}
                            >
                              {isExpanded ? (
                                <IconChevronDown size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                              ) : (
                                <IconChevronRight size={16} className="shrink-0 text-slate-400 dark:text-slate-500" />
                              )}
                              <span className="truncate">{group}</span>
                              <span className="shrink-0 font-normal text-slate-400 dark:text-slate-500">
                                ({items.length})
                              </span>
                            </div>
                            <Switch
                              value={!items.every((item) => disabledFilters.includes(item.key))}
                              onCheck={(v) => onToggleGroupFilter(v, items)}
                            />
                          </div>
                          {isExpanded && (
                            <div>
                              <div className="grid grid-cols-[1fr_auto] gap-2 border-b border-slate-100 px-3 py-1 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:text-slate-500">
                                <span>Name</span>
                                <span className="pr-2">Status</span>
                              </div>
                              {items.map(({ key, name }) => {
                                const isDisabled = disabledFilters?.includes(key)
                                return (
                                  <div
                                    key={key}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() =>
                                      setExtension({
                                        ...extension,
                                        disabledFilters: toggleFilter(disabledFilters, key),
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        setExtension({
                                          ...extension,
                                          disabledFilters: toggleFilter(disabledFilters, key),
                                        })
                                      }
                                    }}
                                    className="grid cursor-pointer grid-cols-[1fr_auto] items-center gap-2 border-b border-slate-100 px-3 py-1.5 text-xs transition-colors select-none last:border-b-0 hover:bg-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                                  >
                                    <span className="truncate text-slate-600 dark:text-slate-400" title={name}>
                                      {name}
                                    </span>
                                    <span
                                      className={cn(
                                        'shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium',
                                        isDisabled
                                          ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500'
                                          : 'bg-green-100 text-green-700'
                                      )}
                                    >
                                      {isDisabled ? 'Off' : 'On'}
                                    </span>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Custom Filters */}
            <div className="flex flex-col gap-2">
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <IconCode size={14} />
                <span className="font-medium">Custom Filters</span>
              </div>
              <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
                Add your own filter rules in ABP format (one per line). e.g. <code>||example.com^$script</code>
              </p>
              <textarea
                value={customFilterText}
                onChange={(e) => setCustomFilterText(e.target.value)}
                placeholder={`||example.com^$script\nexample.com##.ad-banner\n@@||example.com^$document`}
                className="h-24 w-full max-w-md resize-y rounded border border-slate-300 bg-white px-3 py-2 font-mono text-xs focus:border-slate-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
              <div className="mt-2">
                <button
                  type="button"
                  onClick={handleSaveCustomFilters}
                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 text-xs text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
                >
                  Save Custom Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <IconDeviceFloppy size={16} />
          Save
        </button>
      </div>
    </div>
  )
}
