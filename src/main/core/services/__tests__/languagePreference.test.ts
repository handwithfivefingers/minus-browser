// @vitest-environment node
import { ipcMain } from 'electron'

import { describe, expect, it, beforeEach, vi } from 'vitest'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import {
  FALLBACK_LANGUAGES,
  getLanguagePreference,
  registerLanguagePreferenceIpc,
  setLanguagePreference,
} from '../languagePreference'

describe('languagePreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setLanguagePreference([])
  })

  it('falls back to system languages when no preference is set', () => {
    expect(getLanguagePreference()).toEqual(['vi-VN', 'vi'])
  })

  it('stores and returns an explicit language preference', () => {
    setLanguagePreference(['en-US', 'en'])
    expect(getLanguagePreference()).toEqual(['en-US', 'en'])
  })

  it('clears back to system default with an empty list', () => {
    setLanguagePreference(['ja-JP', 'ja'])
    setLanguagePreference([])
    expect(getLanguagePreference()).toEqual(FALLBACK_LANGUAGES)
  })

  it('ignores empty entries', () => {
    setLanguagePreference(['', 'vi', ''])
    expect(getLanguagePreference()).toEqual(['vi'])
  })

  it('registers a sync IPC handler returning the current preference', () => {
    registerLanguagePreferenceIpc()
    expect(ipcMain.on).toHaveBeenCalledWith(IPC_INVOKE_CHANNEL.LANGUAGE_GET, expect.any(Function))

    const handler = vi.mocked(ipcMain.on).mock.calls[0][1]
    setLanguagePreference(['vi-VN', 'vi'])
    const event = { returnValue: undefined as unknown } as Electron.IpcMainEvent
    handler(event)
    expect(event.returnValue).toEqual(['vi-VN', 'vi'])
  })
})
