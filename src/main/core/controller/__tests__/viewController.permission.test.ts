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

const mockSubWindowService = vi.hoisted(() => ({
  openWithResult: vi.fn(),
  open: vi.fn(),
  isOpen: false,
  ensureOnTop: vi.fn(),
  resolveRequest: vi.fn(),
  init: vi.fn(),
  warmup: vi.fn(() => Promise.resolve()),
}))

vi.mock('~/features/sub-window/service', () => ({
  subWindowService: mockSubWindowService,
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

import { WebContentsView } from 'electron'

import { permissionStore } from '~/main/core/stores/permission.store'

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

type Cb = (...args: any[]) => void

function createMockWebContentsView(overrides = {}) {
  const listeners: Record<string, Cb[]> = {}
  return {
    webContents: {
      id: 1,
      getURL: vi.fn(() => 'https://example.com/page'),
      session: {
        setPermissionRequestHandler: vi.fn(),
        setPermissionCheckHandler: vi.fn(),
      },
      ipc: { on: vi.fn() },
      setWindowOpenHandler: vi.fn(),
      on: vi.fn((event: string, cb: Cb) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      }),
      once: vi.fn((event: string, cb: Cb) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(cb)
      }),
      ...overrides,
    },
    setBounds: vi.fn(),
    getBounds: vi.fn(() => ({ x: 0, y: 0, width: 800, height: 600 })),
  } as unknown as WebContentsView
}

function makeDetails(overrides: Record<string, any> = {}) {
  return {
    isMainFrame: true,
    requestingUrl: 'https://example.com/page',
    embeddingOrigin: 'https://example.com',
    mediaType: undefined as string | undefined,
    mediaTypes: undefined as string[] | undefined,
    ...overrides,
  }
}

describe('ViewController permission logic', () => {
  let vc: ViewController
  let mockView: WebContentsView

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.get.mockReturnValue(undefined)
    mockDb.query.mockReturnValue([])

    const win = createMockWindow()
    vc = new ViewController(win)
    mockView = createMockWebContentsView()
    ;(vc as any).setupPermissionHandler(mockView)
  })

  describe('extractHostname', () => {
    it('extracts hostname from a standard URL', () => {
      const result = (vc as any).extractHostname('https://www.example.com/path')
      expect(result).toBe('www.example.com')
    })

    it('extracts hostname from a URL with port', () => {
      const result = (vc as any).extractHostname('http://example.com:8080/page')
      expect(result).toBe('example.com')
    })

    it('returns null for an invalid URL', () => {
      const result = (vc as any).extractHostname('')
      expect(result).toBeNull()
    })

    it('returns null for garbage input', () => {
      const result = (vc as any).extractHostname('not a url')
      expect(result).toBeNull()
    })
  })

  describe('hasPendingRequestForOrigin', () => {
    it('returns true when a matching pending request exists', () => {
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, origin: 'example.com', permission: 'notifications', webContents: {} },
      ]
      expect((vc as any).hasPendingRequestForOrigin('example.com', 'notifications')).toBe(true)
    })

    it('returns false when origin does not match', () => {
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, origin: 'other.com', permission: 'notifications', webContents: {} },
      ]
      expect((vc as any).hasPendingRequestForOrigin('example.com', 'notifications')).toBe(false)
    })

    it('returns false when permission type does not match', () => {
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, origin: 'example.com', permission: 'media', webContents: {} },
      ]
      expect((vc as any).hasPendingRequestForOrigin('example.com', 'notifications')).toBe(false)
    })

    it('returns false when there are no pending requests', () => {
      ;(vc as any).pendingPermissions = []
      expect((vc as any).hasPendingRequestForOrigin('example.com', 'notifications')).toBe(false)
    })
  })

  describe('isPermissionGrantedForOrigin', () => {
    it('returns true when the exact permission is granted', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('grant')
      expect((vc as any).isPermissionGrantedForOrigin('example.com', 'notifications', makeDetails())).toBe(true)
    })

    it('returns false when the permission is not granted', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      expect((vc as any).isPermissionGrantedForOrigin('example.com', 'notifications', makeDetails())).toBe(false)
    })

    it('returns false when the permission is denied', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('deny')
      expect((vc as any).isPermissionGrantedForOrigin('example.com', 'notifications', makeDetails())).toBe(false)
    })

    describe('media permission granularity', () => {
      it('returns true when a media subtype is granted (mediaType)', () => {
        vi.mocked(permissionStore.getSitePermission).mockImplementation((origin, perm) => {
          if (perm === 'media:audio') return 'grant'
          return 'prompt'
        })
        expect(
          (vc as any).isPermissionGrantedForOrigin('example.com', 'media', makeDetails({ mediaType: 'audio' }))
        ).toBe(true)
        expect(permissionStore.getSitePermission).toHaveBeenCalledWith('example.com', 'media:audio')
      })

      it('returns true when all media subtypes are granted (mediaTypes)', () => {
        vi.mocked(permissionStore.getSitePermission).mockImplementation((origin, perm) => {
          if (perm === 'media:audio' || perm === 'media:video') return 'grant'
          return 'prompt'
        })
        expect(
          (vc as any).isPermissionGrantedForOrigin(
            'example.com',
            'media',
            makeDetails({ mediaTypes: ['audio', 'video'] })
          )
        ).toBe(true)
        expect(permissionStore.getSitePermission).toHaveBeenCalledWith('example.com', 'media:audio')
        expect(permissionStore.getSitePermission).toHaveBeenCalledWith('example.com', 'media:video')
      })

      it('returns false when not all media subtypes are granted', () => {
        vi.mocked(permissionStore.getSitePermission).mockImplementation((origin, perm) => {
          if (perm === 'media:audio') return 'grant'
          return 'prompt'
        })
        expect(
          (vc as any).isPermissionGrantedForOrigin(
            'example.com',
            'media',
            makeDetails({ mediaTypes: ['audio', 'video'] })
          )
        ).toBe(false)
      })

      it('returns false when media subtypes are requested but none is stored', () => {
        vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
        expect(
          (vc as any).isPermissionGrantedForOrigin('example.com', 'media', makeDetails({ mediaType: 'audio' }))
        ).toBe(false)
      })
    })
  })

  describe('removePermissionsForContents', () => {
    it('removes pending permissions for the given webContents', () => {
      const wcA = { id: 1 }
      const wcB = { id: 2 }
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: wcA, origin: 'a.com', permission: 'notifications' },
        { permissionId: 2, webContents: wcB, origin: 'b.com', permission: 'media' },
      ]
      ;(vc as any).removePermissionsForContents(wcA)
      expect((vc as any).pendingPermissions).toEqual([
        { permissionId: 2, webContents: wcB, origin: 'b.com', permission: 'media' },
      ])
    })

    it('resets tab media state when tab is found', () => {
      const wc = { id: 99 }
      const mockTab = {
        isUsingCamera: true,
        isUsingMicrophone: true,
        isUsingScreenShare: true,
        persistInformationToRenderer: vi.fn(),
      }
      vi.spyOn(vc as any, 'findTabByWebContents').mockReturnValue(mockTab)

      ;(vc as any).removePermissionsForContents(wc)

      expect(mockTab.isUsingCamera).toBe(false)
      expect(mockTab.isUsingMicrophone).toBe(false)
      expect(mockTab.isUsingScreenShare).toBe(false)
      expect(mockTab.persistInformationToRenderer).toHaveBeenCalledWith({
        isUsingCamera: false,
        isUsingMicrophone: false,
        isUsingScreenShare: false,
      })
    })

    it('does not crash when tab is not found', () => {
      vi.spyOn(vc as any, 'findTabByWebContents').mockReturnValue(undefined)
      expect(() => (vc as any).removePermissionsForContents({ id: 999 })).not.toThrow()
    })
  })

  describe('setPermissionRequestHandler callback', () => {
    let requestHandler: Cb

    function createRequestCallback() {
      return vi.fn()
    }

    beforeEach(() => {
      const session = mockView.webContents.session
      requestHandler = (session.setPermissionRequestHandler as any).mock.calls[0][0]
    })

    it('auto-grants clipboard-write', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'clipboard-write', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('auto-grants clipboard-sanitized-write', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'clipboard-sanitized-write', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('auto-grants pointerLock', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'pointerLock', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('auto-grants fullscreen', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'fullscreen', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('denies request when not in main frame', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'notifications', cb, makeDetails({ isMainFrame: false }))
      expect(cb).toHaveBeenCalledWith(false)
    })

    it('denies request when requestingUrl is missing', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'notifications', cb, makeDetails({ requestingUrl: '' }))
      expect(cb).toHaveBeenCalledWith(false)
    })

    it('denies unsupported permissions', () => {
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'geolocation', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(false)
    })

    it('grants when permission is already stored as grant', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('grant')
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'notifications', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('denies and tracks blocked notification when stored as deny', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('deny')
      const trackSpy = vi.spyOn(vc as any, 'trackBlockedNotification').mockReturnValue(undefined)
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'notifications', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(false)
      expect(trackSpy).toHaveBeenCalledWith(mockView.webContents)
    })

    it('denies without tracking when stored as deny for non-notification', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('deny')
      const trackSpy = vi.spyOn(vc as any, 'trackBlockedNotification').mockReturnValue(undefined)
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'media', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(false)
      expect(trackSpy).not.toHaveBeenCalled()
    })

    it('deduplicates pending notification requests for the same origin', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: { id: 2 }, origin: 'example.com', permission: 'notifications' },
      ]
      const cb = createRequestCallback()
      requestHandler(mockView.webContents, 'notifications', cb, makeDetails())
      expect(cb).toHaveBeenCalledWith(false)
    })

    it('shows prompt and grants when user approves', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: true, remember: false })

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect(mockSubWindowService.openWithResult).toHaveBeenCalledWith('/permission', {
        permission: 'notifications',
        origin: 'example.com',
      })
      expect(cb).toHaveBeenCalledWith(true)
    })

    it('shows prompt and denies when user blocks', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: false, remember: false })

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect(cb).toHaveBeenCalledWith(false)
    })

    it('persists permission when remember is true', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: true, remember: true })

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect(permissionStore.setSitePermission).toHaveBeenCalledWith('example.com', 'notifications', 'grant')
    })

    it('persists media sub-types when remember is true and mediaTypes present', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: true, remember: true })

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'media', cb, makeDetails({ mediaTypes: ['audio', 'video'] }))

      expect(permissionStore.setSitePermission).toHaveBeenCalledWith('example.com', 'media:audio', 'grant')
      expect(permissionStore.setSitePermission).toHaveBeenCalledWith('example.com', 'media:video', 'grant')
      expect(permissionStore.setSitePermission).toHaveBeenCalledWith('example.com', 'media', 'grant')
    })

    it('cleans up pending permission after prompt resolves', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: true, remember: false })

      expect((vc as any).pendingPermissions.length).toBe(0)

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect((vc as any).pendingPermissions.length).toBe(0)
    })

    it('calls request(false) when openWithResult throws', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockRejectedValue(new Error('closed'))

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect(cb).toHaveBeenCalledWith(false)
      expect((vc as any).pendingPermissions.length).toBe(0)
    })

    it('tracks blocked notification when user denies a notification prompt', async () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      mockSubWindowService.openWithResult.mockResolvedValue({ decision: false, remember: false })
      const trackSpy = vi.spyOn(vc as any, 'trackBlockedNotification').mockReturnValue(undefined)

      const cb = createRequestCallback()
      await requestHandler(mockView.webContents, 'notifications', cb, makeDetails())

      expect(trackSpy).toHaveBeenCalledWith(mockView.webContents)
    })
  })

  describe('setPermissionCheckHandler callback', () => {
    let checkHandler: Cb

    beforeEach(() => {
      const session = mockView.webContents.session
      checkHandler = (session.setPermissionCheckHandler as any).mock.calls[0][0]
    })

    it('auto-grants clipboard-sanitized-write', () => {
      const result = checkHandler(
        mockView.webContents,
        'clipboard-sanitized-write',
        'https://example.com',
        makeDetails()
      )
      expect(result).toBe(true)
    })

    it('returns false for cross-origin iframe', () => {
      const result = checkHandler(
        mockView.webContents,
        'notifications',
        'https://embed.com',
        makeDetails({ isMainFrame: false, embeddingOrigin: 'https://parent.com' })
      )
      expect(result).toBe(false)
    })

    it('allows same-origin iframe', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('grant')
      const result = checkHandler(
        mockView.webContents,
        'notifications',
        'https://example.com',
        makeDetails({ isMainFrame: false, embeddingOrigin: 'https://example.com' })
      )
      expect(result).toBe(true)
    })

    it('returns false when requestingOrigin is empty', () => {
      const result = checkHandler(mockView.webContents, 'notifications', '', makeDetails())
      expect(result).toBe(false)
    })

    it('returns true when permission is granted for the origin', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('grant')
      const result = checkHandler(mockView.webContents, 'notifications', 'https://example.com', makeDetails())
      expect(result).toBe(true)
    })

    it('returns false when permission is not granted', () => {
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      const result = checkHandler(mockView.webContents, 'notifications', 'https://example.com', makeDetails())
      expect(result).toBe(false)
    })
  })

  describe('navigation cleanup', () => {
    it('registers did-start-navigation handler', () => {
      expect(mockView.webContents.on).toHaveBeenCalledWith('did-start-navigation', expect.any(Function))
    })

    it('registers destroyed handler', () => {
      expect(mockView.webContents.once).toHaveBeenCalledWith('destroyed', expect.any(Function))
    })

    it('calls removePermissionsForContents on main-frame non-in-place navigation', () => {
      const handler = (mockView.webContents.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'did-start-navigation'
      )?.[1]
      expect(handler).toBeDefined()
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: mockView.webContents, origin: 'example.com', permission: 'notifications' },
      ]
      handler(null, 'https://new-page.com', false, true)
      expect((vc as any).pendingPermissions).toEqual([])
    })

    it('does not clean up on in-place navigation', () => {
      const handler = (mockView.webContents.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'did-start-navigation'
      )?.[1]
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: mockView.webContents, origin: 'example.com', permission: 'notifications' },
      ]
      handler(null, 'https://same-page.com#hash', true, true)
      expect((vc as any).pendingPermissions).toHaveLength(1)
    })

    it('does not clean up on sub-frame navigation', () => {
      const handler = (mockView.webContents.on as any).mock.calls.find(
        (c: any[]) => c[0] === 'did-start-navigation'
      )?.[1]
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: mockView.webContents, origin: 'example.com', permission: 'notifications' },
      ]
      handler(null, 'https://example.com/iframe', false, false)
      expect((vc as any).pendingPermissions).toHaveLength(1)
    })

    it('calls removePermissionsForContents on webContents destroyed', () => {
      const handler = (mockView.webContents.once as any).mock.calls.find((c: any[]) => c[0] === 'destroyed')?.[1]
      expect(handler).toBeDefined()
      ;(vc as any).pendingPermissions = [
        { permissionId: 1, webContents: mockView.webContents, origin: 'example.com', permission: 'notifications' },
      ]
      handler()
      expect((vc as any).pendingPermissions).toEqual([])
    })
  })

  describe('popup blocking policy', () => {
    function makeTab(overrides: Record<string, any> = {}) {
      return {
        url: 'https://example.com/page',
        blockedPopups: 0,
        webContents: { getURL: vi.fn(() => 'https://example.com/page') },
        persistInformationToRenderer: vi.fn(),
        ...overrides,
      }
    }

    const request = (url: string) => ({ url, frameName: '', disposition: 'new-window' })

    it('opens popup as tab when blocking is disabled globally', () => {
      ;(vc as any).userInterface = { blockPopups: false }
      const tab = makeTab()
      const openSpy = vi.spyOn(vc as any, 'openPopupAsTab')
      ;(vc as any).handleWindowOpen(tab, request('https://login.example.com'))
      expect(openSpy).toHaveBeenCalledWith('https://login.example.com')
      expect(permissionStore.getSitePermission).not.toHaveBeenCalled()
    })

    it('opens popup as tab when the site is granted', () => {
      ;(vc as any).userInterface = { blockPopups: true }
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('grant')
      const tab = makeTab()
      const openSpy = vi.spyOn(vc as any, 'openPopupAsTab')
      ;(vc as any).handleWindowOpen(tab, request('https://login.example.com'))
      expect(openSpy).toHaveBeenCalledWith('https://login.example.com')
      expect(permissionStore.getSitePermission).toHaveBeenCalledWith('https://example.com', 'popups')
    })

    it('blocks popup silently when the site is denied', () => {
      ;(vc as any).userInterface = { blockPopups: true }
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('deny')
      const tab = makeTab()
      const trackSpy = vi.spyOn(vc as any, 'trackBlockedPopup')
      ;(vc as any).handleWindowOpen(tab, request('https://login.example.com'))
      expect(trackSpy).toHaveBeenCalledWith(tab)
    })

    it('asks the user when no popup decision is stored', () => {
      ;(vc as any).userInterface = { blockPopups: true }
      vi.mocked(permissionStore.getSitePermission).mockReturnValue('prompt')
      const tab = makeTab()
      const promptSpy = vi.spyOn(vc as any, 'promptPopup').mockResolvedValue(undefined)
      ;(vc as any).handleWindowOpen(tab, request('https://login.example.com'))
      expect(promptSpy).toHaveBeenCalledWith(tab, 'https://example.com', 'https://login.example.com')
    })

    it('ignores empty/unsafe popup urls', () => {
      ;(vc as any).userInterface = { blockPopups: true }
      const tab = makeTab()
      const promptSpy = vi.spyOn(vc as any, 'promptPopup')
      ;(vc as any).handleWindowOpen(tab, request(''))
      expect(promptSpy).not.toHaveBeenCalled()
    })

    describe('promptPopup', () => {
      it('opens the popup as a tab when allowed', async () => {
        mockSubWindowService.openWithResult.mockResolvedValue({ decision: 'allow', remember: false })
        const tab = makeTab()
        const openSpy = vi.spyOn(vc as any, 'openPopupAsTab')
        await (vc as any).promptPopup(tab, 'https://example.com', 'https://login.example.com')
        expect(openSpy).toHaveBeenCalledWith('https://login.example.com')
      })

      it('persists grant when the user always allows', async () => {
        mockSubWindowService.openWithResult.mockResolvedValue({ decision: 'allow', remember: true })
        const tab = makeTab()
        vi.spyOn(vc as any, 'openPopupAsTab')
        await (vc as any).promptPopup(tab, 'https://example.com', 'https://login.example.com')
        expect(permissionStore.setSitePermission).toHaveBeenCalledWith('https://example.com', 'popups', 'grant')
      })

      it('persists deny when the user always blocks', async () => {
        mockSubWindowService.openWithResult.mockResolvedValue({ decision: 'block', remember: true })
        const tab = makeTab()
        await (vc as any).promptPopup(tab, 'https://example.com', 'https://login.example.com')
        expect(permissionStore.setSitePermission).toHaveBeenCalledWith('https://example.com', 'popups', 'deny')
      })

      it('tracks the blocked popup when the user blocks', async () => {
        mockSubWindowService.openWithResult.mockResolvedValue({ decision: 'block', remember: false })
        const tab = makeTab()
        const trackSpy = vi.spyOn(vc as any, 'trackBlockedPopup')
        await (vc as any).promptPopup(tab, 'https://example.com', 'https://login.example.com')
        expect(trackSpy).toHaveBeenCalledWith(tab)
      })

      it('tracks the blocked popup when the prompt closes without a decision', async () => {
        mockSubWindowService.openWithResult.mockRejectedValue(new Error('closed'))
        const tab = makeTab()
        const trackSpy = vi.spyOn(vc as any, 'trackBlockedPopup')
        await (vc as any).promptPopup(tab, 'https://example.com', 'https://login.example.com')
        expect(trackSpy).toHaveBeenCalledWith(tab)
      })
    })

    it('trackBlockedPopup increments the count and notifies the renderer', () => {
      const tab = makeTab()
      ;(vc as any).trackBlockedPopup(tab)
      expect(tab.blockedPopups).toBe(1)
      expect(tab.persistInformationToRenderer).toHaveBeenCalledWith({ blockedPopups: 1 })
      expect(vc.window.webContents.send).toHaveBeenCalledWith('GET_TABS', expect.anything())
    })
  })
})
