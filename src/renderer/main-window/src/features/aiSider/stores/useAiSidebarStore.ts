import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import { useAiSettingsStore } from './useAiSettingsStore'

export type AiSidebarMode = 'chat' | 'summarize' | 'generate' | 'explain' | 'capture'

function getDefaultMode(): AiSidebarMode {
  const mode = useAiSettingsStore.getState().defaultMode
  if (['chat', 'summarize', 'generate', 'explain', 'capture'].includes(mode)) return mode
  return 'chat'
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

interface IAiSidebarStore {
  isOpen: boolean
  activeMode: AiSidebarMode
  width: number
  pendingText: string
  chatMessages: ChatMessage[]
  capturedImage: string | null
  toggle: () => void
  open: () => void
  close: () => void
  setMode: (mode: AiSidebarMode) => void
  setWidth: (width: number) => void
  setPendingText: (text: string) => void
  clearPendingText: () => void
  setChatMessages: (messages: ChatMessage[]) => void
  clearChatMessages: () => void
  setCapturedImage: (image: string | null) => void
}

const useAiSidebarStore = create<IAiSidebarStore>()(
  persist(
    (set) => ({
      isOpen: false,
      activeMode: getDefaultMode(),
      width: 380,
      pendingText: '',
      chatMessages: [],
      capturedImage: null,
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      setMode: (mode) => set({ activeMode: mode }),
      setWidth: (width) => set({ width }),
      setPendingText: (text) => set({ pendingText: text }),
      clearPendingText: () => set({ pendingText: '' }),
      setChatMessages: (messages) => set({ chatMessages: messages }),
      clearChatMessages: () => set({ chatMessages: [] }),
      setCapturedImage: (image) => set({ capturedImage: image }),
    }),
    {
      name: 'minus_ai_sidebar',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ chatMessages: state.chatMessages }),
    }
  )
)

export { useAiSidebarStore }
