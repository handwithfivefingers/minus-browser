import { IconArrowRight, IconClock, IconPlus, IconSearch, IconSwitchHorizontal, IconWorld } from '@tabler/icons-react'

import { cn } from '~/renderer/main-window/src/libs/cn'

import { SpotlightAction } from '../../types/spotlight'

interface SpotlightActionItemProps {
  action: SpotlightAction
  active: boolean
  onMouseEnter: () => void
}

const KIND_ICON_CLASS: Record<SpotlightAction['kind'], string> = {
  tab: 'bg-slate-100 text-slate-500 ring-slate-300 group-hover:text-slate-700 dark:bg-white/6 dark:text-white/60 dark:ring-white/8 dark:group-hover:text-white/80',
  search:
    'bg-emerald-100 text-emerald-600 ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400/80 dark:ring-emerald-400/20',
  history:
    'bg-amber-100 text-amber-600 ring-amber-300 dark:bg-amber-500/10 dark:text-amber-400/80 dark:ring-amber-400/20',
  create:
    'bg-indigo-100 text-indigo-600 ring-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400/80 dark:ring-indigo-400/20',
}

const renderIcon = (kind: SpotlightAction['kind']) => {
  switch (kind) {
    case 'tab':
      return <IconSwitchHorizontal size={16} />
    case 'search':
      return <IconSearch size={16} />
    case 'history':
      return <IconClock size={16} />
    case 'create':
      return <IconPlus size={16} />
  }
}

export const SpotlightActionItem = ({ action, active, onMouseEnter }: SpotlightActionItemProps) => {
  return (
    <button
      type="button"
      className={cn(
        'group relative mx-2 flex w-[calc(100%-16px)] items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-150',
        active
          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/12 dark:text-white'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800 dark:text-white/70 dark:hover:bg-white/4 dark:hover:text-white/90'
      )}
      onMouseEnter={onMouseEnter}
      onClick={action.onSelect}
    >
      {active && <span className="absolute inset-0 rounded-xl ring-1 ring-indigo-400/25 ring-inset" />}
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-all duration-150',
          KIND_ICON_CLASS[action.kind]
        )}
      >
        {renderIcon(action.kind)}
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
}
