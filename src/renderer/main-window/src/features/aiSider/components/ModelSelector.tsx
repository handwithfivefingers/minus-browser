import { IconChevronDown, IconRefresh } from '@tabler/icons-react'
import { useRef, useState } from 'react'

import { fetchModels } from '../services/aiProvider'
import type { AiModel } from '../services/aiProvider'

const ModelSelector = ({ selected, onSelect }: { selected: string; onSelect: (model: string) => void }) => {
  const [open, setOpen] = useState(false)
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const current = models.find((m) => m.id === selected) || { id: selected, label: selected }

  const loadModels = async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    setLoading(true)
    setError(null)
    try {
      const list = await fetchModels()
      setModels(list)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load models'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = () => {
    if (!open) loadModels()
    setOpen(!open)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    fetchedRef.current = false
    setModels([])
    setError(null)
    loadModels()
  }

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700"
      >
        {current.label}
        <IconChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-20 mt-1 max-h-60 min-w-45 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                <div className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                Loading models...
              </div>
            )}
            {error && !loading && <div className="px-3 py-2 text-xs text-red-500">{error}</div>}
            {!loading && !error && models.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">No models available</div>
            )}
            {!loading &&
              models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id)
                    setOpen(false)
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs transition-colors ${
                    model.id === selected ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{model.label}</span>
                </button>
              ))}
            {!loading && models.length > 0 && (
              <button
                onClick={handleRefresh}
                className="flex w-full cursor-pointer items-center gap-1 border-t border-slate-100 px-3 py-1.5 text-left text-[10px] text-slate-400 transition-colors hover:text-indigo-500"
              >
                <IconRefresh size={10} />
                Refresh
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export { ModelSelector }
