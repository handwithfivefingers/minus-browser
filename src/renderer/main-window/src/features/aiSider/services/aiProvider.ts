import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

import { useAiSettingsStore } from '../stores/useAiSettingsStore'

const PROVIDER_CONFIGS: Record<string, { baseUrl: string }> = {
  groq: { baseUrl: 'https://api.groq.com/openai/v1' },
  openai: { baseUrl: 'https://api.openai.com/v1' },
}

function getClient(): OpenAI {
  const settings = useAiSettingsStore.getState()
  let apiKey = settings.apiKey || ''
  let baseUrl = settings.baseUrl || ''
  const provider = settings.provider || 'groq'
  const conf = PROVIDER_CONFIGS[provider]
  if (!baseUrl) baseUrl = conf?.baseUrl || PROVIDER_CONFIGS.groq.baseUrl

  if (!apiKey) {
    // @ts-ignore
    apiKey = import.meta.env.VITE_GROQ_AI_API_KEY || ''
  }
  if (!apiKey) {
    throw new Error('API key is not set. Please configure it in Settings.')
  }
  if (!baseUrl) {
    baseUrl = PROVIDER_CONFIGS.groq.baseUrl
  }
  return new OpenAI({
    apiKey,
    baseURL: baseUrl,
    dangerouslyAllowBrowser: true,
  })
}

export type AiMessageContent =
  string | Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }>

export type AiMessage = {
  role: 'system' | 'user' | 'assistant'
  content: AiMessageContent
}

export type AiCompletionOptions = {
  model?: string
  temperature?: number
  maxTokens?: number
}

function getDefaultModel(): string {
  return useAiSettingsStore.getState().defaultModel || 'llama-3.3-70b-versatile'
}

export type AiModel = {
  id: string
  label: string
}

export async function fetchModels(): Promise<AiModel[]> {
  const client = getClient()
  const list = await client.models.list()
  return list.data.map((m) => ({ id: m.id, label: m.id }))
}

function resolveCompletionOptions(options: AiCompletionOptions): AiCompletionOptions {
  const settings = useAiSettingsStore.getState()
  return {
    model: options.model || getDefaultModel(),
    temperature: options.temperature ?? settings.temperature ?? 0.7,
    maxTokens: options.maxTokens ?? settings.maxTokens ?? 4096,
  }
}

export async function* chatCompletionStream(
  messages: AiMessage[],
  options: AiCompletionOptions = {}
): AsyncGenerator<string> {
  const resolved = resolveCompletionOptions(options)
  const stream = await getClient().chat.completions.create({
    model: resolved.model,
    messages: messages as ChatCompletionMessageParam[],
    temperature: resolved.temperature,
    max_tokens: resolved.maxTokens,
    stream: true,
  })

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || ''
    if (content) {
      yield content
    }
  }
}
