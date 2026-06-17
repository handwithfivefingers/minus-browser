import { IconCheck, IconCopy, IconReload, IconSparkles } from "@tabler/icons-react";
import { useState } from "react";
import { generateContent } from "../services/generator";
import type { GenerateTemplate } from "../services/promptTemplates";

const TEMPLATES: { key: GenerateTemplate; label: string }[] = [
  { key: "email", label: "Email" },
  { key: "blog", label: "Blog Post" },
  { key: "social", label: "Social Media" },
  { key: "code", label: "Code" },
  { key: "custom", label: "Custom" },
];

const PLACEHOLDERS: Record<GenerateTemplate, string> = {
  email: "e.g., Write a follow-up email to a client about the project deadline",
  blog: "e.g., Benefits of using TypeScript for large-scale applications",
  social: "e.g., Announce our new product launch on Twitter",
  code: "e.g., A React hook to debounce search input",
  custom: "Describe what you want to generate...",
};

const GenerateMode = () => {
  const [template, setTemplate] = useState<GenerateTemplate>("email");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setError(null);
    setResult("");
    setIsLoading(true);
    try {
      const content = await generateContent(template, input);
      setResult(content);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Generation failed";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.metaKey) {
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 shrink-0">
        <span className="text-[11px] font-medium text-slate-500">Content Generator</span>
      </div>

      {/* Template selector */}
      <div className="flex gap-1 px-3 py-2 border-b border-slate-100 shrink-0 overflow-x-auto">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => setTemplate(t.key)}
            className={`shrink-0 px-2.5 py-1 text-[10px] rounded-md cursor-pointer transition-colors ${
              template === t.key
                ? "bg-indigo-100 text-indigo-700 font-medium"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[template]}
          rows={4}
          className="w-full text-xs border border-slate-200 rounded-lg p-2.5 resize-none outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 text-slate-700 placeholder:text-slate-400 scrollbar"
        />

        <button
          onClick={handleGenerate}
          disabled={!input.trim() || isLoading}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          {isLoading ? (
            <>
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-lg p-3">
              {result}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
              >
                {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
              >
                <IconReload size={12} />
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { GenerateMode };
