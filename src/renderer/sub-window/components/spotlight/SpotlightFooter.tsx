interface SpotlightFooterProps {
  activeIndex: number
  actionsLength: number
}

export const SpotlightFooter = ({ activeIndex, actionsLength }: SpotlightFooterProps) => {
  return (
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
        {activeIndex + 1} / {actionsLength}
      </span>
    </div>
  )
}
