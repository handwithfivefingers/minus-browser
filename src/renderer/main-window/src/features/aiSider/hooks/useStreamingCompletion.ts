import { useCallback, useRef, useState } from 'react'

import { chatCompletionStream } from '../services/aiProvider'
import type { AiCompletionOptions, AiMessage } from '../services/aiProvider'

type MessageBuilder = (signal: AbortSignal) => Promise<AiMessage[]> | AiMessage[]

type StreamOptions = AiCompletionOptions & { onChunk?: (content: string) => void }

export function useStreamingCompletion() {
  const [content, setContent] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef('')

  const start = useCallback(async (buildMessages: MessageBuilder, options: StreamOptions = {}) => {
    const { onChunk, ...completionOptions } = options
    abortRef.current?.abort()
    setError(null)
    setContent('')
    contentRef.current = ''
    if (onChunk) onChunk('')
    setIsLoading(true)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const messages = await buildMessages(controller.signal)
      for await (const chunk of chatCompletionStream(messages, completionOptions)) {
        if (controller.signal.aborted) break
        contentRef.current += chunk
        setContent(contentRef.current)
        if (onChunk) onChunk(contentRef.current)
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
        throw err
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setIsLoading(false)
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { content, setContent, isLoading, error, start, stop }
}
