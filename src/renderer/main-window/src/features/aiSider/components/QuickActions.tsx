import { useState } from "react";
import { chatCompletion } from "../services/aiProvider";
import { buildQuickActionMessages } from "../services/promptTemplates";

const ACTIONS = [
  { id: "fix-grammar", label: "Fix Grammar" },
  { id: "simplify", label: "Simplify" },
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "formal", label: "Formal" },
] as const;

const QuickActions = ({
  text,
  onResult,
}: {
  text: string;
  onResult: (result: string) => void;
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  const handleAction = async (actionId: string) => {
    if (!text.trim() || loadingAction) return;
    setLoadingAction(actionId);
    try {
      const messages = buildQuickActionMessages(actionId, text);
      const result = await chatCompletion(messages, { temperature: 0.3 });
      onResult(result);
    } catch {
      onResult("Failed to process. Please try again.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div>
      <p className="text-[10px] font-medium text-slate-500 mb-1.5">Quick Actions</p>
      <div className="flex flex-wrap gap-1">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            disabled={!text.trim() || loadingAction === action.id}
            className="px-2 py-1 text-[10px] bg-slate-100 text-slate-600 rounded-md hover:bg-indigo-100 hover:text-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {loadingAction === action.id ? (
              <span className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Processing...
              </span>
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export { QuickActions };
