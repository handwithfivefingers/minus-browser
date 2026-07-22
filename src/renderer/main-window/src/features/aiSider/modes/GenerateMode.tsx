import { IconCheck, IconCopy, IconReload, IconSparkles } from '@tabler/icons-react'
import { useState } from 'react'

import { generateContent } from '../services/generator'
import type { GenerateTemplate } from '../services/promptTemplates'

const TEMPLATES: { key: GenerateTemplate; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'blog', label: 'Blog Post' },
  { key: 'social', label: 'Social Media' },
  { key: 'code', label: 'Code' },
  { key: 'custom', label: 'Custom' },
]

const PLACEHOLDERS: Record<GenerateTemplate, string> = {
  email: 'e.g., Write a follow-up email to a client about the project deadline',
  blog: 'e.g., Benefits of using TypeScript for large-scale applications',
  social: 'e.g., Announce our new product launch on Twitter',
  code: 'e.g., A React hook to debounce search input',
  custom: 'Describe what you want to generate...',
}

const GenerateMode = () => {
  const [template, setTemplate] = useState<GenerateTemplate>('email')
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!input.trim()) return
    setError(null)
    setResult('')
    setIsLoading(true)
    try {
      const content = await generateContent(template, input)
      setResult(content)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Generation failed'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey) {
      handleGenerate()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <span className="text-[11px] font-medium text-slate-500">Content Generator</span>
      </div>

      {/* Template selector */}
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-slate-100 px-3 py-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplate(t.key)}
            className={`shrink-0 cursor-pointer rounded-md px-2.5 py-1 text-[10px] transition-colors ${
              template === t.key
                ? 'bg-indigo-100 font-medium text-indigo-700'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-2">
        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[template]}
          rows={4}
          className="scrollbar w-full resize-none rounded-lg border border-slate-200 p-2.5 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
        />

        <button
          onClick={handleGenerate}
          disabled={!input.trim() || isLoading}
          className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-indigo-500 py-1.5 text-xs text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isLoading ? (
            <>
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating...
            </>
          ) : (
            <>
              <IconSparkles size={14} />
              Generate
            </>
          )}
        </button>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {result}
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
                onClick={handleGenerate}
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

export { GenerateMode }
