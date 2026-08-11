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

function makeTab(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    isAlive: true,
    isHibernated: false,
    wake: vi.fn(),
    toJSON: vi.fn(() => ({ id })),
    view: { getVisible: vi.fn(() => true) },
    webContents: { focus: vi.fn() },
    ...overrides,
  }
}

describe('ViewController tab switching & focus', () => {
  let vc: ViewController
  let win: ReturnType<typeof createMockWindow>

  beforeEach(() => {
    vi.clearAllMocks()
    mockDb.get.mockReturnValue(undefined)
    mockDb.query.mockReturnValue([])

    win = createMockWindow()
    vc = new ViewController(win)
  })

  function seedTabs(tabs: any[]) {
    const controller = (vc as any).tabController
    controller.tabs = new Map(tabs.map((t) => [t.id, t]))
    controller.activeTab = tabs[0] ?? null
  }

  describe('switchTab', () => {
    it('switches to the next tab', () => {
      const tabs = [makeTab('a'), makeTab('b')]
      seedTabs(tabs)
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(1)

      expect(spy).toHaveBeenCalledWith({ id: 'b' })
    })

    it('switches to the previous tab', () => {
      const tabs = [makeTab('a'), makeTab('b'), makeTab('c')]
      seedTabs(tabs)
      ;(vc as any).tabController.activeTab = tabs[2]
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(-1)

      expect(spy).toHaveBeenCalledWith({ id: 'b' })
    })

    it('wraps forward from the last tab to the first', () => {
      const tabs = [makeTab('a'), makeTab('b')]
      seedTabs(tabs)
      ;(vc as any).tabController.activeTab = tabs[1]
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(1)

      expect(spy).toHaveBeenCalledWith({ id: 'a' })
    })

    it('wraps backward from the first tab to the last', () => {
      const tabs = [makeTab('a'), makeTab('b', { isHibernated: true })]
      seedTabs(tabs)
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(-1)

      expect(spy).toHaveBeenCalledWith({ id: 'b' })
    })

    it('does nothing with fewer than two tabs', () => {
      seedTabs([makeTab('a')])
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(1)

      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when no tabs exist', () => {
      seedTabs([])
      const spy = vi.spyOn(vc, 'handleOpenTabById')

      vc.switchTab(1)

      expect(spy).not.toHaveBeenCalled()
    })
  })

  describe('handleOpenTabById', () => {
    it('wakes a hibernated tab before switching', () => {
      const hibernated = makeTab('a', { isHibernated: true })
      seedTabs([hibernated])

      vc.handleOpenTabById({ id: 'a' })

      expect(hibernated.wake).toHaveBeenCalled()
    })

    it('does not wake an alive tab', () => {
      const alive = makeTab('a', { isHibernated: false })
      seedTabs([alive])

      vc.handleOpenTabById({ id: 'a' })

      expect(alive.wake).not.toHaveBeenCalled()
    })

    it('notifies the renderer and marks the tab active', () => {
      const tabs = [makeTab('a'), makeTab('b')]
      seedTabs(tabs)

      vc.handleOpenTabById({ id: 'b' })

      expect(win.webContents.send).toHaveBeenCalledWith('OPEN_TAB_BY_ID', { id: 'b' })
      expect((vc as any).tabController.activeTab?.id).toBe('b')
      expect((vc as any).tabController.getTabById('b')?.timestamp).toBeDefined()
    })
  })

  describe('focusActiveTab', () => {
    it('focuses the active tab webContents when alive and visible', () => {
      const tab = makeTab('a')
      ;(vc as any).tabController.activeTab = tab

      vc.focusActiveTab()

      expect(tab.webContents.focus).toHaveBeenCalled()
    })

    it('does nothing when tab is not alive', () => {
      const tab = makeTab('a', { isAlive: false })
      ;(vc as any).tabController.activeTab = tab

      vc.focusActiveTab()

      expect(tab.webContents.focus).not.toHaveBeenCalled()
    })

    it('does nothing when the tab view is hidden', () => {
      const tab = makeTab('a')
      tab.view.getVisible.mockReturnValue(false)
      ;(vc as any).tabController.activeTab = tab

      vc.focusActiveTab()

      expect(tab.webContents.focus).not.toHaveBeenCalled()
    })

    it('does nothing while a sub-window overlay is open', () => {
      const tab = makeTab('a')
      ;(vc as any).tabController.activeTab = tab
      mockSubWindowService.isOpen = true

      vc.focusActiveTab()

      expect(tab.webContents.focus).not.toHaveBeenCalled()
      mockSubWindowService.isOpen = false
    })

    it('does nothing when there is no active tab', () => {
      ;(vc as any).tabController.activeTab = null

      expect(() => vc.focusActiveTab()).not.toThrow()
    })
  })
})
