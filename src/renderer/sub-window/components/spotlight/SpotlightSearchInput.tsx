import { IconSearch } from '@tabler/icons-react'
import { RefObject } from 'react'

interface SpotlightSearchInputProps {
  value: string
  inputRef: RefObject<HTMLInputElement | null>
  hasActions: boolean
  onChange: (value: string) => void
  onArrowDown: () => void
  onArrowUp: () => void
  onSubmit: () => void
  onClose: () => void
}

export const SpotlightSearchInput = ({
  value,
  inputRef,
  hasActions,
  onChange,
  onArrowDown,
  onArrowUp,
  onSubmit,
  onClose,
}: SpotlightSearchInputProps) => {
  return (
    <div className="border-b border-slate-200 px-4 py-3 dark:border-white/6">
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 transition-all focus-within:border-indigo-400/30 focus-within:bg-indigo-50 focus-within:ring-1 focus-within:ring-indigo-400/20 dark:border-white/8 dark:bg-white/4 dark:focus-within:bg-indigo-500/5">
        <IconSearch size={17} className="shrink-0 text-slate-400 dark:text-white/30" />
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
              return
            }
            if (event.key === 'ArrowDown' && hasActions) {
              event.preventDefault()
              onArrowDown()
              return
            }
            if (event.key === 'ArrowUp' && hasActions) {
              event.preventDefault()
              onArrowUp()
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
  )
}
