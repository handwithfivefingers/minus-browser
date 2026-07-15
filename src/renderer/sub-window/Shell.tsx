import { type ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
}

export function Shell({ children, title, onClose }: ShellProps) {
  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="fixed inset-0 bg-slate-950/30 backdrop-blur-sm" onClick={onClose} />
      <div className="max-h-[80vh] flex flex-col h-full relative animate-slide-down rounded-2xl border border-white/8 bg-slate-950/70 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden">
        <div className="shrink-0 flex items-center justify-between border-b border-white/6 px-5 py-3">
          <span className="text-sm font-semibold text-white/90">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-all hover:bg-white/6 hover:text-white/70"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 p-4 h-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
