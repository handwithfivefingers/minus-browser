import Fuse from 'fuse.js'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Tab } from '~/renderer/main-window/src/interfaces'
import { isValidDomainOrIP, navigateOrSearch } from '~/renderer/main-window/src/libs'
import { consumePayload } from '~/renderer/sub-window/payload-store'
import { IPC_EMIT_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_EMIT } from '~/shared/constants/ipc/sub-window'

import { IHistoryEntry, SpotlightAction, SpotlightProps } from '../../types/spotlight'

import { SpotlightFooter } from './SpotlightFooter'
import { SpotlightHeader } from './SpotlightHeader'
import { SpotlightResults } from './SpotlightResults'
import { SpotlightSearchInput } from './SpotlightSearchInput'
import { isSameHref, navigateCurrentTab, normalizeForDedupe, openInNewTab } from './utils'

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
      tabUrls.add(normalizeForDedupe(tab.url))
    }

    if (hasQuery) {
      for (const [index, r] of fuseHistory.search(queryText).slice(0, 5).entries()) {
        const entry = r.item
        if (tabUrls.has(entry.url)) continue
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
            openInNewTab(entry.url, closeSpotlight)
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
            navigateCurrentTab(gotoUrl, activeTabId, closeSpotlight)
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
            openInNewTab(gotoUrl, closeSpotlight)
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
          navigateCurrentTab(url, activeTabId, closeSpotlight)
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
            openInNewTab(`https://google.com/search?q=${encodeURIComponent(normalizedQuery)}`, closeSpotlight)
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
          openInNewTab('', closeSpotlight)
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
          openInNewTab('', closeSpotlight)
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
      navigateCurrentTab(url as string, activeTabId, closeSpotlight)
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
          <SpotlightHeader tabCount={tabs.length} onClose={closeSpotlight} />

          <SpotlightSearchInput
            value={query}
            inputRef={inputRef}
            hasActions={actions.length > 0}
            onChange={(value) => {
              setQuery(value)
              setActiveIndex(0)
              keyboardNavRef.current = false
            }}
            onArrowDown={() => {
              keyboardNavRef.current = true
              setActiveIndex((current) => (current + 1) % actions.length)
            }}
            onArrowUp={() => {
              keyboardNavRef.current = true
              setActiveIndex((current) => (current - 1 + actions.length) % actions.length)
            }}
            onSubmit={onSubmit}
            onClose={closeSpotlight}
          />

          <SpotlightResults
            actions={actions}
            activeIndex={activeIndex}
            loading={loading}
            normalizedQuery={normalizedQuery}
            listRef={listRef}
            onSelect={(index) => {
              if (!keyboardNavRef.current) setActiveIndex(index)
            }}
            onPointerMove={() => {
              keyboardNavRef.current = false
            }}
          />

          {actions.length > 0 && <SpotlightFooter activeIndex={activeIndex} actionsLength={actions.length} />}
        </div>
      </div>
    </div>
  )
}
