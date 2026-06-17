import { IconChevronDown, IconRefresh } from "@tabler/icons-react";
import { useRef, useState } from "react";
import { fetchModels } from "../services/aiProvider";
import type { AiModel } from "../services/aiProvider";

const ModelSelector = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (model: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const current = models.find((m) => m.id === selected) || { id: selected, label: selected };

  const loadModels = async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const list = await fetchModels();
      setModels(list);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load models";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!open) loadModels();
    setOpen(!open);
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchedRef.current = false;
    setModels([]);
    setError(null);
    loadModels();
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        {current.label}
        <IconChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-45 max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-400">
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                Loading models...
              </div>
            )}
            {error && !loading && (
              <div className="px-3 py-2 text-xs text-red-500">{error}</div>
            )}
            {!loading && !error && models.length === 0 && (
              <div className="px-3 py-2 text-xs text-slate-400">No models available</div>
            )}
            {!loading &&
              models.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-xs cursor-pointer transition-colors flex items-center justify-between ${
                    model.id === selected
                      ? "bg-indigo-50 text-indigo-600"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{model.label}</span>
                </button>
              ))}
            {!loading && models.length > 0 && (
              <button
                onClick={handleRefresh}
                className="w-full text-left px-3 py-1.5 text-[10px] text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors border-t border-slate-100 flex items-center gap-1"
              >
                <IconRefresh size={10} />
                Refresh
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export { ModelSelector };
