import { IconPlayerStop, IconSend, IconTrash } from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'

import { MessageBubble } from '../components/MessageBubble'
import { ModelSelector } from '../components/ModelSelector'
import { useAiChat } from '../hooks/useAiChat'
import { useAiSidebarStore } from '../stores/useAiSidebarStore'

const ChatMode = () => {
  const { messages, isLoading, error, sendMessage, clearMessages, stopGeneration } = useAiChat()
  const [input, setInput] = useState('')
  const { pendingText, clearPendingText } = useAiSidebarStore()
  const [model, setModel] = useState(() => {
    try {
      const raw = localStorage.getItem('minus_ai_settings')
      if (raw) return JSON.parse(raw).defaultModel || 'llama-3.3-70b-versatile'
    } catch {}
    return 'llama-3.3-70b-versatile'
  })
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!pendingText) return
    const text = pendingText
    clearPendingText()
    setInput('')
    sendMessage(text)
  }, [pendingText])

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-3 py-1.5">
        <ModelSelector selected={model} onSelect={setModel} />
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex cursor-pointer items-center gap-1 text-[10px] text-slate-400 transition-colors hover:text-red-500"
          >
            <IconTrash size={12} />
            New Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={listRef} className="scrollbar flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-sm text-slate-400">
            <p className="mb-1 text-lg font-medium text-slate-500">Chat</p>
            <p className="text-xs">Ask anything about the page or start a conversation</p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-slate-200 p-2">
        <div className="flex items-end gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition-all focus-within:border-indigo-300 focus-within:ring-1 focus-within:ring-indigo-200">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            // rows={1}
            className="scrollbar min-h-32 flex-1 resize-none bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="shrink-0 cursor-pointer rounded-lg bg-red-500 p-1.5 text-white transition-colors hover:bg-red-600"
              title="Stop"
            >
              <IconPlayerStop size={14} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 cursor-pointer rounded-lg bg-indigo-500 p-1.5 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              title="Send"
            >
              <IconSend size={14} />
            </button>
          )}
        </div>
        <p className="mt-1 text-center text-[9px] text-slate-400">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  )
}

export { ChatMode }
