import { IconSwitchHorizontal, IconX } from '@tabler/icons-react'

interface SpotlightHeaderProps {
  tabCount: number
  onClose: () => void
}

export const SpotlightHeader = ({ tabCount, onClose }: SpotlightHeaderProps) => {
  const hasTabs = tabCount > 0

  return (
    <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/6">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500 ring-1 ring-indigo-400/20 dark:text-indigo-300">
        <IconSwitchHorizontal size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold tracking-wide text-slate-800 dark:text-white/90">Search</span>
          <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-slate-500 dark:border-white/8 dark:bg-white/4 dark:text-white/40">
            {hasTabs ? `${tabCount} tab${tabCount !== 1 ? 's' : ''}` : 'Ready'}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-tight text-slate-400 dark:text-white/30">
          Search tabs, open URLs, or create a new tab
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-white/30 dark:hover:bg-white/6 dark:hover:text-white/70"
        title="Close (Esc)"
      >
        <IconX size={16} />
      </button>
    </div>
  )
}
