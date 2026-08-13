import { IconSearch, IconSwitchHorizontal } from '@tabler/icons-react'

import { SpotlightAction } from '../../types/spotlight'

import { SpotlightActionItem } from './SpotlightActionItem'

interface SpotlightResultsProps {
  actions: SpotlightAction[]
  activeIndex: number
  loading: boolean
  normalizedQuery: string
  listRef: React.RefObject<HTMLDivElement | null>
  onSelect: (index: number) => void
  onPointerMove: () => void
}

export const SpotlightResults = ({
  actions,
  activeIndex,
  loading,
  normalizedQuery,
  listRef,
  onSelect,
  onPointerMove,
}: SpotlightResultsProps) => {
  if (actions.length > 0) {
    return (
      <div
        ref={listRef}
        className="max-h-[50vh] scrollbar-thin overflow-y-auto overscroll-contain py-1.5"
        onPointerMove={onPointerMove}
      >
        {actions.map((action, index) => (
          <SpotlightActionItem
            key={action.id}
            action={action}
            active={index === activeIndex}
            onMouseEnter={() => onSelect(index)}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 ring-1 ring-slate-300 dark:bg-white/4 dark:ring-white/6">
        {loading ? (
          <IconSwitchHorizontal size={20} className="animate-pulse text-slate-400 dark:text-white/20" />
        ) : (
          <IconSearch size={20} className="text-slate-400 dark:text-white/20" />
        )}
      </div>
      {loading ? (
        <>
          <p className="text-sm text-slate-500 dark:text-white/30">Loading tabs & history...</p>
          <p className="text-xs text-slate-400 dark:text-white/20">Fetching your browsing data</p>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-500 dark:text-white/30">
            {normalizedQuery ? 'No matching tabs' : 'No open tabs yet'}
          </p>
          <p className="text-xs text-slate-400 dark:text-white/20">
            {normalizedQuery
              ? 'Try a different search or create a new tab'
              : 'Open a tab to see it here, or create a new one'}
          </p>
        </>
      )}
    </div>
  )
}
