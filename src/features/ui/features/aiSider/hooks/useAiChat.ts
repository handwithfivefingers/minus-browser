import { useCallback, useRef, useState } from "react";
import { chatCompletionStream } from "../services/aiProvider";
import { LANGUAGE_MAP } from "../services/promptTemplates";
import type { AiMessage } from "../services/aiProvider";

function getSystemPrompt(): string {
  let language = "english";
  try {
    const raw = localStorage.getItem("minus_ai_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      language = settings.language || "english";
    }
  } catch {}
  const label = LANGUAGE_MAP[language] || "English";
  return `You are a helpful AI assistant. Answer concisely and accurately.\n\nImportant: Respond in ${label}.`;
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

let messageIdCounter = 0;

function generateId(): string {
  messageIdCounter++;
  return `msg_${Date.now()}_${messageIdCounter}`;
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = { id: generateId(), role: "user", content };

    setMessages((prev) => {
      const next = [...prev, userMessage];
      messagesRef.current = next;
      return next;
    });

    const assistantId = generateId();
    const assistantMessage: ChatMessage = { id: assistantId, role: "assistant", content: "" };

    setMessages((prev) => {
      const next = [...prev, assistantMessage];
      messagesRef.current = next;
      return next;
    });

    const history: AiMessage[] = [
      { role: "system", content: getSystemPrompt() },
      ...messagesRef.current.slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    try {
      const abortController = new AbortController();
      abortRef.current = abortController;
      let fullContent = "";

      for await (const chunk of chatCompletionStream(history)) {
        if (abortController.signal.aborted) break;
        fullContent += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)),
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setError(message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
    messagesRef.current = [];
    abortRef.current?.abort();
  }, []);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
  };
}
