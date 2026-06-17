import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

const MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", provider: "Groq" },
  { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B", provider: "Groq" },
  { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B", provider: "Groq" },
  { id: "gemma2-9b-it", label: "Gemma 2 9B", provider: "Groq" },
  { id: "deepseek-r1-distill-llama-70b", label: "DeepSeek R1 70B", provider: "Groq" },
];

const ModelSelector = ({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (model: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const current = MODELS.find((m) => m.id === selected) || MODELS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        {current.label}
        <IconChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1 min-w-45">
            {MODELS.map((model) => (
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
                <span className="text-[9px] text-slate-400">{model.provider}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export { ModelSelector };
