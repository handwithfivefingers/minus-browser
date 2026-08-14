// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    query: vi.fn(),
    get: vi.fn(),
    run: vi.fn(),
    transaction: vi.fn(),
  },
}))

vi.mock('~/main/core/stores/database', () => ({ appDb: mockDb }))

vi.mock('~/main/core/stores', async (importOriginal) => {
  const original = await importOriginal()
  return { ...(original as any), appDb: mockDb }
})

const { mockSession } = vi.hoisted(() => ({
  mockSession: {
    setUserAgent: vi.fn(),
    getUserAgent: vi.fn(() => 'test-user-agent'),
    clearStorageData: vi.fn(),
    cookies: { on: vi.fn(), set: vi.fn(), get: vi.fn() },
    setPreloads: vi.fn(),
    getPreloads: vi.fn(() => []),
  },
}))

vi.mock('~/main/core/services/session', () => ({
  browserSession: mockSession,
}))

vi.mock('~/features/sub-window/service', () => ({
  subWindowService: {
    openWithResult: vi.fn(),
    open: vi.fn(),
    isOpen: false,
    ensureOnTop: vi.fn(),
    resolveRequest: vi.fn(),
    init: vi.fn(),
    warmup: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('~/main/core/stores/permission.store', async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...(original as any),
    permissionStore: {
      getSitePermission: vi.fn(),
      setSitePermission: vi.fn(),
      getSitePermissions: vi.fn(),
      resetSitePermission: vi.fn(),
      resetAllPermissions: vi.fn(),
      getAllSites: vi.fn(),
    },
  }
})

import { ViewController } from '../viewController'

function createMockWindow() {
  return {
    contentView: {
      addChildView: vi.fn(),
      removeChildView: vi.fn(),
      children: [],
    },
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      getURL: vi.fn(() => 'about:blank'),
      getTitle: vi.fn(() => ''),
      session: { cookies: { on: vi.fn(), set: vi.fn(), get: vi.fn() } },
      openDevTools: vi.fn(),
      reload: vi.fn(),
      executeJavaScript: vi.fn(),
      loadURL: vi.fn(),
      findInPage: vi.fn(),
      stopFindInPage: vi.fn(),
      isDevToolsOpened: vi.fn(() => false),
      closeDevTools: vi.fn(),
      isAudioMuted: vi.fn(() => false),
      setAudioMuted: vi.fn(),
    },
    loadURL: vi.fn(),
    loadFile: vi.fn(),
    show: vi.fn(),
    on: vi.fn(),
    isMinimized: vi.fn(() => false),
    restore: vi.fn(),
    focus: vi.fn(),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
    setBounds: vi.fn(),
    close: vi.fn(),
    destroy: vi.fn(),
    getAllWindows: vi.fn(() => []),
    getFocusedWindow: vi.fn(() => null),
  } as any
}

describe('ViewController language handling', () => {
  let vc: ViewController

  beforeEach(async () => {
    vi.clearAllMocks()
    mockDb.get.mockReturnValue(undefined)
    mockDb.query.mockReturnValue([])
    vc = new ViewController(createMockWindow())
    await vc.ready()
    mockSession.setUserAgent.mockClear()
  })

  it('applies an explicit language list to the session', () => {
    ;(vc as any).applyLanguage(['vi-VN', 'vi'])
    expect(mockSession.setUserAgent).toHaveBeenCalledWith('test-user-agent', 'vi-VN,vi')
  })

  it('resolves empty language to the system default with vi fallback', () => {
    ;(vc as any).applyLanguage([])
    expect(mockSession.setUserAgent).toHaveBeenCalledWith('test-user-agent', 'vi-VN,vi')
  })

  it('applies the new language and reloads tabs on save when it changed', async () => {
    ;(vc as any).userInterface = { language: ['en-US', 'en'] }
    await vc.interfaceSave({ language: ['vi-VN', 'vi'], extension: undefined } as any)
    expect(mockSession.setUserAgent).toHaveBeenCalledWith('test-user-agent', 'vi-VN,vi')
  })

  it('does not re-apply language when it is unchanged on save', async () => {
    ;(vc as any).userInterface = { language: ['vi-VN', 'vi'] }
    await vc.interfaceSave({ language: ['vi-VN', 'vi'], extension: undefined } as any)
    expect(mockSession.setUserAgent).not.toHaveBeenCalled()
  })
})
