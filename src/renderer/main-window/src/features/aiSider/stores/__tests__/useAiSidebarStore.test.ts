import { describe, it, expect, beforeEach } from 'vitest'
import { useAiSidebarStore } from '~/renderer/main-window/src/features/aiSider/stores/useAiSidebarStore'

describe('useAiSidebarStore', () => {
  beforeEach(() => {
    useAiSidebarStore.setState({
      isOpen: false,
      activeMode: 'chat',
      width: 380,
      pendingText: '',
      chatMessages: [],
      capturedImage: null,
    })
  })

  it('starts closed in chat mode', () => {
    const s = useAiSidebarStore.getState()
    expect(s.isOpen).toBe(false)
    expect(s.activeMode).toBe('chat')
  })

  it('toggles open/close', () => {
    useAiSidebarStore.getState().toggle()
    expect(useAiSidebarStore.getState().isOpen).toBe(true)
    useAiSidebarStore.getState().toggle()
    expect(useAiSidebarStore.getState().isOpen).toBe(false)
  })

  it('open and close explicitly', () => {
    useAiSidebarStore.getState().open()
    expect(useAiSidebarStore.getState().isOpen).toBe(true)
    useAiSidebarStore.getState().close()
    expect(useAiSidebarStore.getState().isOpen).toBe(false)
  })

  it('sets mode', () => {
    useAiSidebarStore.getState().setMode('summarize')
    expect(useAiSidebarStore.getState().activeMode).toBe('summarize')
  })

  it('sets width', () => {
    useAiSidebarStore.getState().setWidth(500)
    expect(useAiSidebarStore.getState().width).toBe(500)
  })

  it('manages pending text', () => {
    useAiSidebarStore.getState().setPendingText('hello')
    expect(useAiSidebarStore.getState().pendingText).toBe('hello')
    useAiSidebarStore.getState().clearPendingText()
    expect(useAiSidebarStore.getState().pendingText).toBe('')
  })

  it('manages chat messages', () => {
    const msgs = [{ id: '1', role: 'user' as const, content: 'hi' }]
    useAiSidebarStore.getState().setChatMessages(msgs)
    expect(useAiSidebarStore.getState().chatMessages).toHaveLength(1)
    useAiSidebarStore.getState().clearChatMessages()
    expect(useAiSidebarStore.getState().chatMessages).toHaveLength(0)
  })

  it('manages captured image', () => {
    useAiSidebarStore.getState().setCapturedImage('data:image/png;base64,abc')
    expect(useAiSidebarStore.getState().capturedImage).toBe('data:image/png;base64,abc')
    useAiSidebarStore.getState().setCapturedImage(null)
    expect(useAiSidebarStore.getState().capturedImage).toBeNull()
  })
})
