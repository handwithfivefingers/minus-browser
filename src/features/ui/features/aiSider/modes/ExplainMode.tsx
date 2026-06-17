import { IconCheck, IconCopy, IconQuestionMark, IconReload } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useAiSidebarStore } from "../stores/useAiSidebarStore";
import { getSelectedText } from "../services/pageReader";
import { chatCompletion } from "../services/aiProvider";
import { buildExplainMessages } from "../services/promptTemplates";
import { QuickActions } from "../components/QuickActions";

const ExplainMode = () => {
  const { pendingText, clearPendingText } = useAiSidebarStore();
  const [explanation, setExplanation] = useState("");
  const [selectedText, setSelectedText] = useState(pendingText);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (pendingText) {
      clearPendingText();
      handleExplainWithText(pendingText);
    }
  }, []);

  const handleExplainWithText = async (text: string) => {
    setError(null);
    setExplanation("");
    setIsLoading(true);
    try {
      setSelectedText(text);
      const messages = buildExplainMessages(text);
      const result = await chatCompletion(messages, { temperature: 0.3 });
      setExplanation(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to explain";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    setError(null);
    setExplanation("");
    setIsLoading(true);
    try {
      const text = await getSelectedText();
      if (!text) {
        throw new Error("No text selected. Select text on a page and try again.");
      }
      setSelectedText(text);
      const messages = buildExplainMessages(text);
      const result = await chatCompletion(messages, { temperature: 0.3 });
      setExplanation(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to explain";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickActionResult = (result: string) => {
    setExplanation(result);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(explanation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 shrink-0">
        <span className="text-[11px] font-medium text-slate-500">Explain & Quick Actions</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {!explanation && !isLoading && !error && (
          <div className="flex flex-col items-center justify-center min-h-[200px] text-slate-400 text-sm">
            <IconQuestionMark size={32} className="mb-2 text-slate-300" />
            <p className="text-sm text-slate-500 mb-1">Explain selected text</p>
            <p className="text-[10px] text-slate-400 mb-4 text-center">
              Select text on a page, then click the button below
            </p>
            <button
              onClick={handleExplain}
              className="px-4 py-1.5 bg-indigo-500 text-white text-xs rounded-lg hover:bg-indigo-600 cursor-pointer transition-colors"
            >
              Explain Selection
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Reading selection & generating explanation...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">
            {error}
          </div>
        )}

        {selectedText && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
            <p className="text-[9px] font-medium text-slate-400 mb-1">Selected text:</p>
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{selectedText}</p>
          </div>
        )}

        {explanation && (
          <div className="space-y-3">
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              {explanation}
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
                onClick={handleExplain}
                className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-indigo-600 cursor-pointer transition-colors"
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
  );
};

export { ExplainMode };
