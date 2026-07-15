import { IconBrain, IconRobot, IconCloud, IconLanguage, IconRefresh } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { Switch } from "~/renderer/main-window/src/components";
import { useAiSettingsStore } from "~/renderer/main-window/src/features/aiSider/stores/useAiSettingsStore";
import { LANGUAGE_MAP } from "~/renderer/main-window/src/features/aiSider/services/promptTemplates";
import { fetchModels } from "~/renderer/main-window/src/features/aiSider/services/aiProvider";
import type { DefaultMode } from "~/renderer/main-window/src/features/aiSider/stores/useAiSettingsStore";
import type { AiModel } from "~/renderer/main-window/src/features/aiSider/services/aiProvider";

const LANGUAGE_OPTIONS = Object.entries(LANGUAGE_MAP).map(([value, label]) => ({ value, label }));

const PROVIDERS = [
  { id: "groq", label: "Groq" },
  { id: "openai", label: "OpenAI" },
  { id: "custom", label: "Custom" },
];

const MODES: { id: DefaultMode; label: string }[] = [
  { id: "chat", label: "Chat" },
  { id: "summarize", label: "Summarize" },
  { id: "generate", label: "Generate" },
  { id: "explain", label: "Explain" },
];

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
  } = useAiSettingsStore();
  const [models, setModels] = useState<AiModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [modelsFetched, setModelsFetched] = useState(false);
  const fetchedRef = useRef(false);

  const loadModels = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setModelsLoading(true);
    setModelsError(null);
    try {
      const list = await fetchModels();
      setModels(list);
      setModelsFetched(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load models";
      setModelsError(message);
      setModelsFetched(false);
    } finally {
      setModelsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Model selection */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconBrain size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">AI Model</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Default Model</span>
            <div className="relative">
              <select
                value={models.length > 0 && models.find((m) => m.id === defaultModel) ? defaultModel : ""}
                onClick={loadModels}
                onFocus={loadModels}
                onChange={(e) => {
                  if (e.target.value) setDefaultModel(e.target.value);
                }}
                disabled={modelsLoading}
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm w-full disabled:opacity-50 disabled:cursor-wait"
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
                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {modelsFetched && !modelsLoading && (
                <button
                  onClick={() => {
                    fetchedRef.current = false;
                    setModels([]);
                    setModelsFetched(false);
                    loadModels();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors"
                  title="Refresh models"
                >
                  <IconRefresh size={14} />
                </button>
              )}
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Default Mode</span>
            <select
              value={defaultMode}
              onChange={(e) => setDefaultMode(e.target.value as DefaultMode)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconCloud size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Provider & API Key</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Provider</span>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                provider === "groq"
                  ? "gsk_..."
                  : provider === "openai"
                    ? "sk-..."
                    : "Enter your API key"
              }
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono"
            />
          </label>

          {provider === "custom" && (
            <label className="flex flex-col gap-1.5 md:col-span-2">
              <span className="text-sm text-slate-600">Base URL</span>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm font-mono"
              />
            </label>
          )}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconLanguage size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Default Language</h2>
        </div>
        <div className="max-w-60">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Response Language</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
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
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconRobot size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Generation Parameters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">
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
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Max Tokens</span>
            <input
              type="number"
              min={256}
              max={32768}
              step={256}
              value={maxTokens}
              onChange={(e) => setMaxTokens(Math.max(256, parseInt(e.target.value) || 4096))}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            />
          </label>
        </div>
      </div>

      {/* Behavior */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconRobot size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Behavior</h2>
        </div>
        <div className="w-60 bg-slate-100 rounded flex flex-col gap-2 p-2 border border-slate-200">
          <div className="flex gap-2 items-center">
            <label className="text-slate-600 flex-1 text-sm">Show floating AI button on pages</label>
            <Switch
              title="Show floating AI button"
              value={showFloatingButton}
              onCheck={setShowFloatingButton}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="h-10 px-4 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50 cursor-pointer"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export { AiSettings };
