import { describe, it, expect, beforeEach } from 'vitest'
import { useAiSettingsStore } from '~/renderer/main-window/src/features/aiSider/stores/useAiSettingsStore'

describe('useAiSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear()
    useAiSettingsStore.setState({
      defaultModel: 'llama-3.3-70b-versatile',
      defaultMode: 'chat',
      temperature: 0.7,
      maxTokens: 4096,
      showFloatingButton: true,
      provider: 'groq',
      apiKey: '',
      baseUrl: '',
      language: 'english',
    })
  })

  it('has default settings', () => {
    const s = useAiSettingsStore.getState()
    expect(s.defaultModel).toBe('llama-3.3-70b-versatile')
    expect(s.temperature).toBe(0.7)
    expect(s.provider).toBe('groq')
  })

  it('sets default model', () => {
    useAiSettingsStore.getState().setDefaultModel('gpt-4')
    expect(useAiSettingsStore.getState().defaultModel).toBe('gpt-4')
  })

  it('sets default mode', () => {
    useAiSettingsStore.getState().setDefaultMode('summarize')
    expect(useAiSettingsStore.getState().defaultMode).toBe('summarize')
  })

  it('sets temperature', () => {
    useAiSettingsStore.getState().setTemperature(0.5)
    expect(useAiSettingsStore.getState().temperature).toBe(0.5)
  })

  it('sets max tokens', () => {
    useAiSettingsStore.getState().setMaxTokens(2048)
    expect(useAiSettingsStore.getState().maxTokens).toBe(2048)
  })

  it('sets provider', () => {
    useAiSettingsStore.getState().setProvider('openai')
    expect(useAiSettingsStore.getState().provider).toBe('openai')
  })

  it('sets api key', () => {
    useAiSettingsStore.getState().setApiKey('sk-test')
    expect(useAiSettingsStore.getState().apiKey).toBe('sk-test')
  })

  it('sets base url', () => {
    useAiSettingsStore.getState().setBaseUrl('https://api.openai.com/v1')
    expect(useAiSettingsStore.getState().baseUrl).toBe('https://api.openai.com/v1')
  })

  it('sets language', () => {
    useAiSettingsStore.getState().setLanguage('vietnamese')
    expect(useAiSettingsStore.getState().language).toBe('vietnamese')
  })

  it('sets show floating button', () => {
    useAiSettingsStore.getState().setShowFloatingButton(false)
    expect(useAiSettingsStore.getState().showFloatingButton).toBe(false)
  })

  it('resets to defaults', () => {
    useAiSettingsStore.getState().setDefaultModel('custom')
    useAiSettingsStore.getState().reset()
    expect(useAiSettingsStore.getState().defaultModel).toBe('llama-3.3-70b-versatile')
    expect(useAiSettingsStore.getState().temperature).toBe(0.7)
  })

  it('persists to localStorage on changes', () => {
    useAiSettingsStore.getState().setDefaultModel('gpt-4o')
    const raw = localStorage.getItem('minus_ai_settings')
    expect(raw).toBeTruthy()
    const parsed = JSON.parse(raw!)
    expect(parsed.defaultModel).toBe('gpt-4o')
  })
})
