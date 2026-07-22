import { describe, it, expect } from 'vitest'

import { IPC_INVOKE_CHANNEL, IPC_EMIT_CHANNEL, IPC_RENDERER_EVENT } from '~/shared/constants/ipc'
import { SUB_WINDOW_INVOKE, SUB_WINDOW_EMIT, SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

describe('IPC channels', () => {
  it('IPC_INVOKE_CHANNEL has unique values', () => {
    const values = Object.values(IPC_INVOKE_CHANNEL)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('IPC_EMIT_CHANNEL has unique values', () => {
    const values = Object.values(IPC_EMIT_CHANNEL)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('IPC_RENDERER_EVENT has unique values', () => {
    const values = Object.values(IPC_RENDERER_EVENT)
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })

  it('IPC_INVOKE_CHANNEL contains expected keys', () => {
    expect(IPC_INVOKE_CHANNEL).toHaveProperty('GET_TABS')
    expect(IPC_INVOKE_CHANNEL).toHaveProperty('CREATE_TAB')
    expect(IPC_INVOKE_CHANNEL).toHaveProperty('GET_HISTORY')
    expect(IPC_INVOKE_CHANNEL).toHaveProperty('CHECK_FOR_UPDATE')
    expect(IPC_INVOKE_CHANNEL).toHaveProperty('VAULT_LIST')
  })

  it('IPC_EMIT_CHANNEL contains expected keys', () => {
    expect(IPC_EMIT_CHANNEL).toHaveProperty('SHOW_VIEW_BY_ID')
    expect(IPC_EMIT_CHANNEL).toHaveProperty('VIEW_CHANGE_URL')
    expect(IPC_EMIT_CHANNEL).toHaveProperty('THEME_MODE_CHANGED')
  })

  it('IPC_RENDERER_EVENT contains expected keys', () => {
    expect(IPC_RENDERER_EVENT).toHaveProperty('CREATE_TAB')
    expect(IPC_RENDERER_EVENT).toHaveProperty('FAVICON_UPDATED')
    expect(IPC_RENDERER_EVENT).toHaveProperty('UPDATE_STATUS')
  })

  it('sub-window IPC channels exist', () => {
    expect(SUB_WINDOW_INVOKE.RESOLVE).toBe('SUB_WINDOW_RESOLVE')
    expect(SUB_WINDOW_EMIT.NAVIGATE).toBe('SUB_WINDOW_NAVIGATE')
    expect(SUB_WINDOW_RENDERER_EVENT.CLOSE).toBe('SUB_WINDOW_CLOSE')
  })
})
