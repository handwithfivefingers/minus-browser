import { IconCheck, IconCopy, IconQuestionMark, IconReload, IconPlayerStop } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { QuickActions } from '../components/QuickActions'
import { useStreamingCompletion } from '../hooks/useStreamingCompletion'
import { getSelectedText } from '../services/pageReader'
import { buildExplainMessages } from '../services/promptTemplates'
import { useAiSidebarStore } from '../stores/useAiSidebarStore'

const ExplainMode = () => {
  const { pendingText, clearPendingText } = useAiSidebarStore()
  const { content: explanation, setContent, isLoading, error, start, stop } = useStreamingCompletion()
  const [selectedText, setSelectedText] = useState(pendingText)
  const [copied, setCopied] = useState(false)

  const handleExplainWithText = (text: string) => {
    setSelectedText(text)
    start(() => buildExplainMessages(text), { temperature: 0.3 })
  }

  const handleExplain = () => {
    start(
      async () => {
        const text = await getSelectedText()
        if (!text) {
          throw new Error('No text selected. Select text on a page and try again.')
        }
        setSelectedText(text)
        return buildExplainMessages(text)
      },
      { temperature: 0.3 }
    )
  }

  const handleQuickActionResult = (result: string) => {
    setContent(result)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(explanation)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  useEffect(() => {
    if (pendingText) {
      clearPendingText()
      handleExplainWithText(pendingText)
    }
  }, [])
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <span className="text-[11px] font-medium text-slate-500">Explain & Quick Actions</span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {!explanation && !isLoading && !error && (
          <div className="flex min-h-[200px] flex-col items-center justify-center text-sm text-slate-400">
            <IconQuestionMark size={32} className="mb-2 text-slate-300" />
            <p className="mb-1 text-sm text-slate-500">Explain selected text</p>
            <p className="mb-4 text-center text-[10px] text-slate-400">
              Select text on a page, then click the button below
            </p>
            <button
              onClick={handleExplain}
              className="cursor-pointer rounded-lg bg-indigo-500 px-4 py-1.5 text-xs text-white transition-colors hover:bg-indigo-600"
            >
              Explain Selection
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-xs text-slate-400">Reading selection & generating explanation...</span>
            </div>
            <button
              type="button"
              onClick={stop}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-slate-200 px-3 py-1 text-[10px] text-slate-600 transition-colors hover:bg-red-100 hover:text-red-600"
            >
              <IconPlayerStop size={12} />
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {selectedText && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <p className="mb-1 text-[9px] font-medium text-slate-400">Selected text:</p>
            <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">{selectedText}</p>
          </div>
        )}

        {explanation && (
          <div className="space-y-3">
            <div className="text-xs leading-relaxed whitespace-pre-wrap text-slate-700">{explanation}</div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-indigo-600"
              >
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleExplain}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-indigo-600"
              >
                <IconReload size={12} />
                Regenerate
              </button>
            </div>

            <QuickActions text={explanation} onResult={handleQuickActionResult} />
          </div>
        )}
      </div>
    </div>
  )
}

export { ExplainMode }
