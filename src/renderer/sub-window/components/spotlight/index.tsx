import {
  IconArrowRight,
  IconClock,
  IconPlus,
  IconSearch,
  IconSwitchHorizontal,
  IconWorld,
  IconX,
} from '@tabler/icons-react'
import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Tab } from '~/renderer/main-window/src/interfaces'
import { isValidDomainOrIP, navigateOrSearch } from '~/renderer/main-window/src/libs'
import { cn } from '~/renderer/main-window/src/libs/cn'
import { consumePayload } from '~/renderer/sub-window/payload-store'
import { IPC_EMIT_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_EMIT } from '~/shared/constants/ipc/sub-window'

import { IHistoryEntry, SpotlightAction, SpotlightProps } from '../../types/spotlight'

const normalizeHref = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null
  const candidates = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? [trimmed] : [`https://${trimmed}`]
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate)
      const pathname = url.pathname && url.pathname !== '/' ? url.pathname : ''
      return `${url.origin}${pathname}${url.search}${url.hash}`
    } catch (error) {
      /* ignore */
    }
  }
  return null
}

const isSameHref = (a: string, b: string): boolean => {
  const normalized = normalizeHref(a)
  const target = normalizeHref(b)
  return !!normalized && !!target && normalized === target
}

export const SpotlightComponent = () => {
  const [query, setQuery] = useState('')
  const [tabs, setTabs] = useState<Tab[]>([])
  const [history, setHistory] = useState<IHistoryEntry[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [activeTabId, setActiveTabId] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const keyboardNavRef = useRef(false)
  const hasTabs = tabs.length > 0

  const fetchTabs = useCallback(async () => {
    try {
      const result = await window.api.INVOKE<Tab[]>('GET_TABS')
      setTabs(result || [])
    } catch {
      /* ignore */
    }
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const result = await window.api.INVOKE<IHistoryEntry[]>('GET_HISTORY')
      setHistory(result || [])
    } catch {
      /* ignore */
    }
  }, [])

  const closeSpotlight = () => {
    setVisible(false)
    window.api.EMIT(IPC_EMIT_CHANNEL.SPOTLIGHT_CLOSE)
  }

  useEffect(() => {
    const payload = consumePayload<SpotlightProps>()
    if (payload) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery(payload?.query || '')
      setActiveTabId(payload?.activeTabId)
    }

    setVisible(true)
    Promise.all([fetchTabs(), fetchHistory()]).finally(() => setLoading(false))

    inputRef.current?.focus()
    inputRef.current?.select()

    window.api.LISTENER('GET_TABS', (payload?: Tab[]) => {
      setTabs(payload || [])
    })

    window.api.LISTENER('GET_HISTORY', (payload?: IHistoryEntry[]) => {
      setHistory(payload || [])
    })

    window.api.LISTENER(SUB_WINDOW_EMIT.PAYLOAD, (payload: any) => {
      if (payload) {
        setQuery(payload?.query || '')
        setActiveTabId(payload?.activeTabId)
      }
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSpotlight()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!visible) return
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [visible])

  const normalizedQuery = query.trim()

  const navigateCurrentTab = (url: string) => {
    if (activeTabId) {
      window.api.EMIT('VIEW_CHANGE_URL', { id: activeTabId, url })
    } else {
      window.api.INVOKE<{ id: string }>('CREATE_TAB', { url })
    }
  }

  const recentHistory = useMemo(() => history.slice(-300), [history])

  const fuseTabs = useMemo(
    () =>
      new Fuse(tabs, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'url', weight: 0.4 },
        ],
        threshold: 0.35,
        distance: 100,
        minMatchCharLength: 2,
        includeScore: true,
      }),
    [tabs]
  )

  const fuseHistory = useMemo(
    () =>
      new Fuse(recentHistory, {
        keys: [
          { name: 'title', weight: 0.6 },
          { name: 'url', weight: 0.4 },
        ],
        threshold: 0.35,
        distance: 100,
        minMatchCharLength: 2,
        includeScore: true,
      }),
    [recentHistory]
  )

  const actions = useMemo<SpotlightAction[]>(() => {
    const queryText = normalizedQuery.trim().toLowerCase()
    const hasQuery = queryText.length > 0
    const activeTab = tabs.find((tab) => tab.id === activeTabId)
    const items: SpotlightAction[] = []
    const tabUrls = new Set<string>()

    // Re-entering the current page's URL should reload it, like an omnibox.
    if (activeTab && hasQuery && isSameHref(activeTab.url, normalizedQuery)) {
      items.push({
        id: 'reload:active',
        kind: 'create',
        label: `Reload ${activeTab.title || activeTab.url}`,
        description: 'Reload the current page',
        score: 1000,
        onSelect: () => {
          window.api.EMIT('ON_RELOAD', { id: activeTab.id })
          closeSpotlight()
        },
      })
    }

    const rawTabResults: Array<{ tab: Tab; fuzzy: number; order: number }> = hasQuery
      ? fuseTabs
          .search(queryText)
          .slice(0, 6)
          .map((r) => ({ tab: r.item, fuzzy: (r.score ?? 0.5) as number, order: 0 }))
      : tabs.slice(0, 6).map((tab, order) => ({ tab, fuzzy: 0, order }))

    for (const { tab, fuzzy, order } of rawTabResults) {
      const isActive = tab.id === activeTabId
      const exactUrl = hasQuery && isSameHref(tab.url, normalizedQuery)
      const exactTitle = hasQuery && (tab.title || '').toLowerCase() === queryText
      // The active tab with the exact URL is already covered by the reload action.
      if (isActive && exactUrl) continue

      let score: number
      if (exactUrl || exactTitle) score = 900
      else if (hasQuery) score = 800 - Math.round(fuzzy * 300)
      else score = 290 - order * 10 + (isActive ? 5 : 0)

      items.push({
        id: `tab:${tab.id}`,
        kind: 'tab',
        label: tab.title || tab.url || 'New tab',
        description: tab.url || 'Switch to tab',
        score,
        onSelect: () => {
          window.api.EMIT('OPEN_TAB_BY_ID', { id: tab.id })
          closeSpotlight()
        },
      })
      tabUrls.add(normalizeHref(tab.url) || tab.url)
    }

    if (hasQuery) {
      for (const [index, r] of fuseHistory.search(queryText).slice(0, 5).entries()) {
        const entry = r.item
        if (tabUrls.has(normalizeHref(entry.url) || entry.url)) continue
        const fuzzy: number = (r.score ?? 0.5) as number
        const exactUrl = isSameHref(entry.url, normalizedQuery)
        const score = exactUrl ? 620 : Math.max(290, 540 - Math.round(fuzzy * 250))
        items.push({
          id: `history:${entry.id}:${index}`,
          kind: 'history',
          label: entry.title || entry.url,
          description: entry.url,
          score,
          onSelect: () => {
            window.api
              .INVOKE<{ id: string }>('CREATE_TAB', { url: entry.url })
              // @ts-ignore
              .finally(closeSpotlight)
          },
        })
      }
    }

    if (hasQuery) {
      const isDomain = isValidDomainOrIP(normalizedQuery)
      const gotoUrl = navigateOrSearch(normalizedQuery)
      const gotoMatchesActive = activeTab && !!gotoUrl && isSameHref(activeTab.url, gotoUrl)
      const gotoMatchesTab = !!gotoUrl && tabs.some((tab) => isSameHref(tab.url, gotoUrl))

      if (isDomain && gotoUrl && !gotoMatchesActive) {
        items.push({
          id: `goto:${normalizedQuery}`,
          kind: 'create',
          label: `Go to "${normalizedQuery}"`,
          description: gotoMatchesTab ? 'Navigate to an address that is already open' : 'Navigate current tab',
          score: gotoMatchesTab ? 360 : 680,
          onSelect: () => {
            navigateCurrentTab(gotoUrl)
            closeSpotlight()
          },
        })
      }

      if (isDomain && gotoUrl && !gotoMatchesTab) {
        items.push({
          id: `open-new-tab:${normalizedQuery}`,
          kind: 'create',
          label: `Open "${normalizedQuery}" in a new tab`,
          description: 'Open the typed address in a fresh tab',
          score: 480,
          onSelect: () => {
            window.api
              .INVOKE<{ id: string }>('CREATE_TAB', { url: gotoUrl })
              // @ts-ignore
              .finally(closeSpotlight)
          },
        })
      }

      items.push({
        id: `search:${normalizedQuery}`,
        kind: 'search',
        label: `Search for "${normalizedQuery}"`,
        description: isDomain ? 'Search for this text' : 'Navigate current tab to search results',
        score: isDomain ? 460 : 500,
        onSelect: () => {
          const url = `https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`
          navigateCurrentTab(url)
          closeSpotlight()
        },
      })

      if (!isDomain) {
        items.push({
          id: `search-new-tab:${normalizedQuery}`,
          kind: 'create',
          label: `Search "${normalizedQuery}" in a new tab`,
          description: 'Open search results in a fresh tab',
          score: 440,
          onSelect: () => {
            window.api
              .INVOKE<{ id: string }>('CREATE_TAB', {
                url: `https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`,
              })
              // @ts-ignore
              .finally(closeSpotlight)
          },
        })
      }

      items.push({
        id: 'create:new-tab',
        kind: 'create',
        label: 'Create new tab',
        description: 'Open a blank tab',
        score: 420,
        onSelect: () => {
          // @ts-ignore
          window.api.INVOKE<{ id: string }>('CREATE_TAB').finally(closeSpotlight)
        },
      })
    } else {
      items.push({
        id: 'create:new-tab',
        kind: 'create',
        label: 'Create new tab',
        description: 'Open a fresh tab',
        score: 200,
        onSelect: () => {
          // @ts-ignore
          window.api.INVOKE<{ id: string }>('CREATE_TAB').finally(closeSpotlight)
        },
      })
    }

    return items.sort((a, b) => b.score - a.score)
  }, [normalizedQuery, tabs, history, recentHistory, activeTabId])

  useEffect(() => {
    if (activeIndex >= actions.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveIndex(Math.max(actions.length - 1, 0))
    }
  }, [actions.length, activeIndex])

  useEffect(() => {
    if (listRef.current && actions[activeIndex]) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex, actions.length])

  const onSubmit = () => {
    if (actions[activeIndex]) {
      actions[activeIndex].onSelect()
      return
    }
    if (normalizedQuery) {
      const url = navigateOrSearch(normalizedQuery)
      navigateCurrentTab(url as string)
    } else {
      window.api.INVOKE<{ id: string }>('CREATE_TAB')
    }
    closeSpotlight()
  }

  if (!visible) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-999 flex items-start justify-center pt-16 md:pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeSpotlight()
      }}
      aria-hidden
    >
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md dark:bg-slate-950/60"
        onClick={closeSpotlight}
        aria-hidden
      />

      <div className="animate-slide-down relative mx-4 w-full max-w-2xl">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_40px_80px_rgba(0,0,0,0.1)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/95 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-400/20 dark:text-indigo-300">
              <IconSwitchHorizontal size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-white/90">Search</span>
                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-500 dark:border-white/8 dark:bg-white/4 dark:text-white/40">
                  {hasTabs ? `${tabs.length} tab${tabs.length !== 1 ? 's' : ''}` : 'Ready'}
                </span>
              </div>
              <p className="mt-0.5 text-[13px] leading-tight text-slate-400 dark:text-white/30">
                Search tabs, open URLs, or create a new tab
              </p>
            </div>
            <button
              type="button"
              onClick={closeSpotlight}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-white/30 dark:hover:bg-white/6 dark:hover:text-white/70"
              title="Close (Esc)"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="border-b border-slate-200 px-4 py-3 dark:border-white/6">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-indigo-400/30 focus-within:bg-indigo-50 focus-within:ring-1 focus-within:ring-indigo-400/20 dark:border-white/8 dark:bg-white/4 dark:focus-within:bg-indigo-500/5">
              <IconSearch size={17} className="shrink-0 text-slate-400 dark:text-white/30" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActiveIndex(0)
                  keyboardNavRef.current = false
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    closeSpotlight()
                    return
                  }
                  if (event.key === 'ArrowDown' && actions.length) {
                    event.preventDefault()
                    keyboardNavRef.current = true
                    setActiveIndex((current) => (current + 1) % actions.length)
                    return
                  }
                  if (event.key === 'ArrowUp' && actions.length) {
                    event.preventDefault()
                    keyboardNavRef.current = true
                    setActiveIndex((current) => (current - 1 + actions.length) % actions.length)
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    onSubmit()
                  }
                }}
                placeholder="Search tabs, open URLs, or create a new tab..."
                className="min-w-0 flex-1 bg-transparent text-[15px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-white/90 dark:placeholder:text-white/25"
              />
              <div className="hidden items-center gap-1.5 md:flex">
                <kbd className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:border-white/8 dark:bg-white/4 dark:text-white/50">
                  {navigator.platform.includes('Mac') ? '⌘ + K' : 'Ctrl + K'}
                </kbd>
              </div>
            </div>
          </div>

          <div
            ref={listRef}
            className="max-h-[50vh] scrollbar-thin overflow-y-auto overscroll-contain py-1.5"
            onPointerMove={() => {
              keyboardNavRef.current = false
            }}
          >
            {actions.length > 0 ? (
              actions.map((action, index) => {
                const active = index === activeIndex
                return (
                  <button
                    type="button"
                    key={action.id}
                    className={cn(
                      'group relative mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
                      active
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/12 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-white/70 dark:hover:bg-white/4 dark:hover:text-white/90'
                    )}
                    onMouseEnter={() => {
                      if (!keyboardNavRef.current) setActiveIndex(index)
                    }}
                    onClick={action.onSelect}
                  >
                    {active && <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-400/25 ring-inset" />}
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all duration-150',
                        action.kind === 'tab'
                          ? 'bg-slate-100 text-slate-500 ring-slate-300 group-hover:text-slate-700 dark:bg-white/6 dark:text-white/60 dark:ring-white/8 dark:group-hover:text-white/80'
                          : action.kind === 'search'
                            ? 'bg-emerald-100 text-emerald-600 ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400/80 dark:ring-emerald-400/20'
                            : action.kind === 'history'
                              ? 'bg-amber-100 text-amber-600 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-400/80 dark:ring-amber-400/20'
                              : 'bg-indigo-100 text-indigo-600 ring-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400/80 dark:ring-indigo-400/20'
                      )}
                    >
                      {action.kind === 'tab' ? (
                        <IconSwitchHorizontal size={16} />
                      ) : action.kind === 'search' ? (
                        <IconSearch size={16} />
                      ) : action.kind === 'history' ? (
                        <IconClock size={16} />
                      ) : (
                        <IconPlus size={16} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm leading-snug font-medium">
                        {action.kind === 'tab' && (
                          <span className="mr-1.5 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-slate-500 uppercase dark:bg-white/6 dark:text-white/30">
                            Tab
                          </span>
                        )}
                        {action.label}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-slate-400 dark:text-white/35">
                        {action.kind === 'tab' && <IconWorld size={12} className="shrink-0" />}
                        {action.description}
                      </div>
                    </div>
                    <IconArrowRight
                      size={15}
                      className={cn(
                        'shrink-0 transition-all duration-150',
                        active
                          ? 'translate-x-0 text-indigo-500/60 dark:text-indigo-400/60'
                          : '-translate-x-1 text-slate-300 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 dark:text-white/20'
                      )}
                    />
                  </button>
                )
              })
            ) : loading ? (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-300 dark:bg-white/4 dark:ring-white/6">
                  <IconSwitchHorizontal size={20} className="animate-pulse text-slate-400 dark:text-white/20" />
                </div>
                <p className="text-sm text-slate-500 dark:text-white/30">Loading tabs & history...</p>
                <p className="text-xs text-slate-400 dark:text-white/20">Fetching your browsing data</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-300 dark:bg-white/4 dark:ring-white/6">
                  <IconSearch size={20} className="text-slate-400 dark:text-white/20" />
                </div>
                <p className="text-sm text-slate-500 dark:text-white/30">
                  {normalizedQuery ? 'No matching tabs' : 'No open tabs yet'}
                </p>
                <p className="text-xs text-slate-400 dark:text-white/20">
                  {normalizedQuery
                    ? 'Try a different search or create a new tab'
                    : 'Open a tab to see it here, or create a new one'}
                </p>
              </div>
            )}
          </div>

          {actions.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-2.5 dark:border-white/6">
              <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-white/50">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-medium dark:border-white/8 dark:bg-white/4">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-300 bg-slate-100 px-1.5 py-0.5 font-medium dark:border-white/8 dark:bg-white/4">
                    Enter
                  </kbd>
                  Select
                </span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-white/20">
                {activeIndex + 1} / {actions.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
