import { useCallback, useRef, useState } from 'react'

import { chatCompletionStream } from '../services/aiProvider'
import type { AiCompletionOptions, AiMessage } from '../services/aiProvider'
import { LANGUAGE_MAP } from '../services/promptTemplates'
import { useAiSettingsStore } from '../stores/useAiSettingsStore'
import { useAiSidebarStore } from '../stores/useAiSidebarStore'
import type { ChatMessage } from '../stores/useAiSidebarStore'

function getSystemPrompt(): string {
  const language = useAiSettingsStore.getState().language || 'english'
  const label = LANGUAGE_MAP[language] || 'English'
  return `You are a helpful AI assistant. Answer concisely and accurately.\n\nImportant: Respond in ${label}.`
}

let messageIdCounter = 0

const MAX_HISTORY_MESSAGES = 20

function generateId(): string {
  messageIdCounter++
  return `msg_${Date.now()}_${messageIdCounter}`
}

export function useAiChat() {
  const messages = useAiSidebarStore((s) => s.chatMessages)
  const setChatMessages = useAiSidebarStore((s) => s.setChatMessages)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const messagesRef = useRef<ChatMessage[]>(messages)
  const sendMessage = useCallback(async (content: string, options?: AiCompletionOptions, imageUrl?: string) => {
    setError(null)
    setIsLoading(true)

    const userMessage: ChatMessage = { id: generateId(), role: 'user', content }
    const nextWithUser = [...messagesRef.current, userMessage]
    messagesRef.current = nextWithUser
    setChatMessages(nextWithUser)

    const assistantId = generateId()
    const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '' }
    const nextWithAssistant = [...messagesRef.current, assistantMessage]
    messagesRef.current = nextWithAssistant
    setChatMessages(nextWithAssistant)

    const history: AiMessage[] = [
      { role: 'system', content: getSystemPrompt() },
      ...messagesRef.current
        .slice(0, -1)
        .slice(-MAX_HISTORY_MESSAGES)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
    ]

    if (imageUrl) {
      history.push({
        role: 'user',
        content: [
          { type: 'text', text: content },
          { type: 'image_url', image_url: { url: imageUrl } },
        ],
      })
    }

    try {
      const abortController = new AbortController()
      abortRef.current = abortController
      let fullContent = ''

      for await (const chunk of chatCompletionStream(history, options)) {
        if (abortController.signal.aborted) break
        fullContent += chunk
        const updated = messagesRef.current.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m))
        messagesRef.current = updated
        setChatMessages(updated)
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(message)
      const filtered = messagesRef.current.filter((m) => m.id !== assistantId)
      messagesRef.current = filtered
      setChatMessages(filtered)
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [])

  const clearMessages = useCallback(() => {
    setChatMessages([])
    setError(null)
    messagesRef.current = []
    abortRef.current?.abort()
  }, [])

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    stopGeneration,
  }
}
