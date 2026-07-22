import { type ReactNode } from 'react'

interface ShellProps {
  children: ReactNode
  title: string
  onClose: () => void
}

export function Shell({ children, title, onClose }: ShellProps) {
  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-hidden
    >
      <div
        className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm dark:bg-slate-950/30"
        onClick={onClose}
        aria-hidden
      />
      <div className="animate-slide-down relative flex h-full max-h-[80vh] flex-col overflow-hidden rounded-2xl border border-white/8 bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.08),0_40px_80px_rgba(0,0,0,0.12)] backdrop-blur-xl dark:border-white/8 dark:bg-slate-950/70 dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-white/6">
          <span className="text-sm font-semibold text-slate-800 dark:text-white/90">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:text-white/30 dark:hover:bg-white/6 dark:hover:text-white/70"
          >
            ✕
          </button>
        </div>
        <div className="h-full flex-1 overflow-hidden p-4">{children}</div>
      </div>
    </div>
  )
}
