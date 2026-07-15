import { IconCopy, IconCheck, IconReload, IconFileText } from "@tabler/icons-react";
import { useState } from "react";
import { summarizePage } from "../services/summarizer";

const SummaryMode = () => {
  const [summary, setSummary] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSummarize = async () => {
    setError(null);
    setSummary("");
    setIsLoading(true);
    try {
      const result = await summarizePage("detailed");
      setSummary(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to summarize";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 shrink-0">
        <span className="text-[11px] font-medium text-slate-500">Page Summary</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!summary && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <IconFileText size={32} className="mb-2 text-slate-300" />
            <p className="text-sm text-slate-500 mb-1">Summarize this page</p>
            <p className="text-[10px] text-slate-400 mb-4 text-center">
              Get a concise summary of the current page content
            </p>
            <button
              onClick={handleSummarize}
              className="px-4 py-1.5 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 cursor-pointer transition-colors"
            >
              Summarize
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Reading page & generating summary...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600 mb-3">
            {error}
          </div>
        )}

        {summary && (
          <div className="space-y-2">
            <div className="prose prose-sm max-w-none text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {summary}
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
                onClick={handleSummarize}
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

export { SummaryMode };
