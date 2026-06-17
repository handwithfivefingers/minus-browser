import { create } from "zustand";

export type AiSidebarMode = "chat" | "summarize" | "generate" | "explain";

function getDefaultMode(): AiSidebarMode {
  try {
    const raw = localStorage.getItem("minus_ai_settings");
    if (raw) {
      const settings = JSON.parse(raw);
      const mode = settings.defaultMode;
      if (["chat", "summarize", "generate", "explain"].includes(mode)) return mode;
    }
  } catch {}
  return "chat";
}

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface IAiSidebarStore {
  isOpen: boolean;
  activeMode: AiSidebarMode;
  width: number;
  pendingText: string;
  chatMessages: ChatMessage[];
  toggle: () => void;
  open: () => void;
  close: () => void;
  setMode: (mode: AiSidebarMode) => void;
  setWidth: (width: number) => void;
  setPendingText: (text: string) => void;
  clearPendingText: () => void;
  setChatMessages: (messages: ChatMessage[]) => void;
  clearChatMessages: () => void;
}

const useAiSidebarStore = create<IAiSidebarStore>((set) => ({
  isOpen: false,
  activeMode: getDefaultMode(),
  width: 380,
  pendingText: "",
  chatMessages: [],
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setMode: (mode) => set({ activeMode: mode }),
  setWidth: (width) => set({ width }),
  setPendingText: (text) => set({ pendingText: text }),
  clearPendingText: () => set({ pendingText: "" }),
  setChatMessages: (messages) => set({ chatMessages: messages }),
  clearChatMessages: () => set({ chatMessages: [] }),
}));

export { useAiSidebarStore };