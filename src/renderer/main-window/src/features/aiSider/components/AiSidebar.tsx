import {
  IconBrain,
  IconBrandWechat,
  IconFileText,
  IconLanguage,
  IconPencil,
  IconQuestionMark,
  IconX,
} from '@tabler/icons-react'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'

import { CaptureMode, ChatMode, ExplainMode, GenerateMode, SummaryMode } from '../modes'
import { LANGUAGE_MAP } from '../services/promptTemplates'
import { useAiSettingsStore } from '../stores/useAiSettingsStore'
import { AiSidebarMode, useAiSidebarStore } from '../stores/useAiSidebarStore'

/** @ts-ignore */
import styles from './styles.module.css'

const MODE_TABS: { key: AiSidebarMode; label: string; icon: React.ReactNode }[] = [
  { key: 'chat', label: 'Chat', icon: <IconBrandWechat size={16} /> },
  { key: 'summarize', label: 'Summarize', icon: <IconFileText size={16} /> },
  { key: 'generate', label: 'Generate', icon: <IconPencil size={16} /> },
  { key: 'explain', label: 'Explain', icon: <IconQuestionMark size={16} /> },
  // { key: "capture", label: "Capture", icon: <IconCamera size={16} /> },
]

const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_MAP).map(([value, label]) => ({ value, label }))

const AiSidebar = () => {
  const { isOpen, activeMode, width, close, setMode, setWidth } = useAiSidebarStore()
  const { language, setLanguage } = useAiSettingsStore()
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isDragging) return
      const newWidth = window.innerWidth - e.clientX
      if (newWidth >= 300 && newWidth <= 600) {
        setWidth(newWidth)
      }
    }

    const stopResize = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
    }

    return () => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
    }
  }, [isDragging, setWidth])

  return (
    <div
      ref={sidebarRef}
      className={clsx(
        'flex h-full shrink-0 flex-col overflow-hidden bg-white transition-all duration-200 dark:bg-slate-800',
        styles.sidebar,
        {
          'w-0 opacity-0': !isOpen,
          'border-l': isOpen,
        }
      )}
      style={{
        width: isOpen ? `${width}px` : '0px',
        minWidth: isOpen ? '300px' : '0px',
      }}
    >
      {/* Resize handle (left edge) */}
      <div
        aria-hidden
        className="transition-colors hover:bg-indigo-400"
        onMouseDown={startResize}
        style={{
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '3px',
          cursor: 'col-resize',
          zIndex: 10,
          backgroundColor: isDragging ? '#818cf8' : 'transparent',
        }}
      />

      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm font-semibold text-indigo-500">
          <IconBrain size={16} />
          <span>AI Sidebar</span>
        </div>
        <button
          onClick={close}
          className="cursor-pointer rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-300"
          title="Close AI sidebar"
        >
          <IconX size={16} />
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-700">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key)}
            className={clsx(
              'flex flex-1 cursor-pointer items-center justify-center gap-1 py-2 text-xs font-medium transition-colors',
              {
                'border-b-2 border-indigo-500 bg-indigo-50/50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-900/20 dark:text-indigo-400':
                  activeMode === tab.key,
                'text-slate-500 hover:bg-slate-50 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-300':
                  activeMode !== tab.key,
              }
            )}
            title={tab.label}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Language selector */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1 dark:border-slate-700">
        <div className="flex items-center gap-1.5">
          <IconLanguage size={12} className="text-slate-400 dark:text-slate-500" />
          <span className="text-[10px] text-slate-500 dark:text-slate-400">Language</span>
        </div>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-600 outline-none focus:border-indigo-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
        >
          {LANGUAGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {activeMode === 'chat' && <ChatMode />}
        {activeMode === 'summarize' && <SummaryMode />}
        {activeMode === 'generate' && <GenerateMode />}
        {activeMode === 'explain' && <ExplainMode />}
        {activeMode === 'capture' && <CaptureMode />}
      </div>
    </div>
  )
}

export { AiSidebar }
