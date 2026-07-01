import { IconPlayerStop, IconSend, IconTrash } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "../components/MessageBubble";
import { ModelSelector } from "../components/ModelSelector";
import { useAiChat } from "../hooks/useAiChat";
import { useAiSidebarStore } from "../stores/useAiSidebarStore";

const ChatMode = () => {
  const { messages, isLoading, error, sendMessage, clearMessages, stopGeneration } = useAiChat();
  const [input, setInput] = useState("");
  const { pendingText, clearPendingText } = useAiSidebarStore();
  const [model, setModel] = useState(() => {
    try {
      const raw = localStorage.getItem("minus_ai_settings");
      if (raw) return JSON.parse(raw).defaultModel || "llama-3.3-70b-versatile";
    } catch {}
    return "llama-3.3-70b-versatile";
  });
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!pendingText) return;
    const text = pendingText;
    clearPendingText();
    setInput("");
    sendMessage(text);
  }, [pendingText]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 shrink-0">
        <ModelSelector selected={model} onSelect={setModel} />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 cursor-pointer transition-colors"
          >
            <IconTrash size={12} />
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1 scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
            <p className="text-lg font-medium text-slate-500 mb-1">Chat</p>
            <p className="text-xs">Ask anything about the page or start a conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-600">{error}</div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 p-2 shrink-0">
        <div className="flex items-end gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-200 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            // rows={1}
            className="flex-1 bg-transparent resize-none text-sm outline-none text-slate-700 placeholder:text-slate-400 min-h-32 scrollbar"
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="shrink-0 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 cursor-pointer transition-colors"
              title="Stop"
            >
              <IconPlayerStop size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 p-1.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-slate-300 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Send"
            >
              <IconSend size={14} />
            </button>
          )}
        </div>
        <p className="text-[9px] text-slate-400 text-center mt-1">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};

export { ChatMode };
