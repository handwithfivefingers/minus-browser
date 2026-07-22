import { IconCopy, IconCheck, IconReload, IconFileText } from '@tabler/icons-react'
import { useState } from 'react'

import { summarizePage } from '../services/summarizer'

const SummaryMode = () => {
  const [summary, setSummary] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSummarize = async () => {
    setError(null)
    setSummary('')
    setIsLoading(true)
    try {
      const result = await summarizePage('detailed')
      setSummary(result)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to summarize'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <span className="text-[11px] font-medium text-slate-500">Page Summary</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!summary && !isLoading && !error && (
          <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
            <IconFileText size={32} className="mb-2 text-slate-300" />
            <p className="mb-1 text-sm text-slate-500">Summarize this page</p>
            <p className="mb-4 text-center text-[10px] text-slate-400">
              Get a concise summary of the current page content
            </p>
            <button
              onClick={handleSummarize}
              className="cursor-pointer rounded-lg bg-indigo-500 px-4 py-1.5 text-xs text-white transition-colors hover:bg-indigo-600"
            >
              Summarize
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <span className="text-xs text-slate-400">Reading page & generating summary...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {summary && (
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {summary}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-indigo-600"
              >
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSummarize}
                className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 transition-colors hover:text-indigo-600"
              >
                <IconReload size={12} />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export { SummaryMode }
