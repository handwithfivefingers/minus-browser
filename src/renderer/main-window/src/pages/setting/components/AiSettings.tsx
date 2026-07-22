import { IconBrain, IconRobot, IconCloud, IconLanguage, IconRefresh } from '@tabler/icons-react'
import { useRef, useState } from 'react'

import { Switch } from '~/renderer/main-window/src/components'
import { fetchModels } from '~/renderer/main-window/src/features/aiSider/services/aiProvider'
import type { AiModel } from '~/renderer/main-window/src/features/aiSider/services/aiProvider'
import { LANGUAGE_MAP } from '~/renderer/main-window/src/features/aiSider/services/promptTemplates'
import { useAiSettingsStore } from '~/renderer/main-window/src/features/aiSider/stores/useAiSettingsStore'
import type { DefaultMode } from '~/renderer/main-window/src/features/aiSider/stores/useAiSettingsStore'

const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_MAP).map(([value, label]) => ({ value, label }))

const PROVIDERS = [
  { id: 'groq', label: 'Groq' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'custom', label: 'Custom' },
]

const MODES: { id: DefaultMode; label: string }[] = [
  { id: 'chat', label: 'Chat' },
  { id: 'summarize', label: 'Summarize' },
  { id: 'generate', label: 'Generate' },
  { id: 'explain', label: 'Explain' },
]

const AiSettings = () => {
  const {
    defaultModel,
    defaultMode,
    temperature,
    maxTokens,
    showFloatingButton,
    provider,
    apiKey,
    baseUrl,
    language,
    setDefaultModel,
    setDefaultMode,
    setTemperature,
    setMaxTokens,
    setShowFloatingButton,
    setProvider,
    setApiKey,
    setBaseUrl,
    setLanguage,
    reset,
  } = useAiSettingsStore()
  const [models, setModels] = useState<AiModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string | null>(null)
  const [modelsFetched, setModelsFetched] = useState(false)
  const fetchedRef = useRef(false)

  const loadModels = async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    setModelsLoading(true)
    setModelsError(null)
    try {
      const list = await fetchModels()
      setModels(list)
      setModelsFetched(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load models'
      setModelsError(message)
      setModelsFetched(false)
    } finally {
      setModelsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Model selection */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconBrain size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">AI Model</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Default Model</span>
            <div className="relative">
              <select
                value={models.length > 0 && models.find((m) => m.id === defaultModel) ? defaultModel : ''}
                onClick={loadModels}
                onFocus={loadModels}
                onChange={(e) => {
                  if (e.target.value) setDefaultModel(e.target.value)
                }}
                disabled={modelsLoading}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm disabled:cursor-wait disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              >
                {modelsLoading && <option value="">Loading models...</option>}
                {modelsError && !modelsLoading && <option value="">Failed to load — click to retry</option>}
                {models.length === 0 && !modelsFetched && !modelsLoading && (
                  <option value="">Click to load models</option>
                )}
                {models.length === 0 && modelsFetched && !modelsLoading && (
                  <option value="">No models available</option>
                )}
                {modelsFetched && !models.find((m) => m.id === defaultModel) && (
                  <option value={defaultModel}>{defaultModel}</option>
                )}
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              {modelsLoading && (
                <div className="absolute top-1/2 right-8 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
              )}
              {modelsFetched && !modelsLoading && (
                <button
                  onClick={() => {
                    fetchedRef.current = false
                    setModels([])
                    setModelsFetched(false)
                    loadModels()
                  }}
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer p-0.5 text-slate-400 transition-colors hover:text-indigo-500 dark:text-slate-500"
                  title="Refresh models"
                >
                  <IconRefresh size={14} />
                </button>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Default Mode</span>
            <select
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value as DefaultMode)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {MODES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Provider & API Key */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconCloud size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Provider & API Key</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'groq' ? 'gsk_...' : provider === 'openai' ? 'sk-...' : 'Enter your API key'}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </label>

          {provider === 'custom' && (
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-sm text-slate-600 dark:text-slate-400">Base URL</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </label>
          )}
        </div>
      </div>

      {/* Language */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconLanguage size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Default Language</h2>
        </div>
        <div className="max-w-60">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Response Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Generation params */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconRobot size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Generation Parameters</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Temperature: <strong>{temperature.toFixed(1)}</strong>
            </span>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Max Tokens</span>
            <input
              type="number"
              min={256}
              max={32768}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.max(256, parseInt(e.target.value) || 4096))}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            />
          </label>
        </div>
      </div>

      {/* Behavior */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconRobot size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Behavior</h2>
        </div>
        <div className="flex w-60 flex-col gap-2 rounded border border-slate-200 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-slate-600 dark:text-slate-400">Show floating AI button on pages</span>
            <Switch label="Show floating AI button" value={showFloatingButton} onCheck={setShowFloatingButton} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-10 cursor-pointer rounded-lg border border-slate-300 px-4 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  )
}

export { AiSettings }
