import { autoUpdater } from 'electron'

import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => {
  const mockAutoUpdater = {
    on: vi.fn().mockReturnThis(),
    checkForUpdates: vi.fn(),
    quitAndInstall: vi.fn(),
  }
  return {
    autoUpdater: mockAutoUpdater,
  }
})

vi.mock('update-electron-app', () => ({
  updateElectronApp: vi.fn(),
}))

import { checkForUpdates, initAutoUpdate, quitAndInstall } from '~/features/autoUpdate/autoUpdate.init'

describe('autoUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initAutoUpdate', () => {
    it('registers event listeners', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      expect(autoUpdater.on).toHaveBeenCalledWith('checking-for-update', expect.any(Function))
      expect(autoUpdater.on).toHaveBeenCalledWith('update-available', expect.any(Function))
      expect(autoUpdater.on).toHaveBeenCalledWith('update-not-available', expect.any(Function))
      expect(autoUpdater.on).toHaveBeenCalledWith('error', expect.any(Function))
      expect(autoUpdater.on).toHaveBeenCalledWith('download-progress', expect.any(Function))
      expect(autoUpdater.on).toHaveBeenCalledWith('update-downloaded', expect.any(Function))
    })

    it('emits checking status', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const checkingHandler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'checking-for-update')[1]
      checkingHandler()
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'checking' })
    })

    it('emits available status', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'update-available')[1]
      handler()
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'available' })
    })

    it('emits not-available status', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'update-not-available')[1]
      handler()
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'not-available' })
    })

    it('emits error status', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'error')[1]
      handler(new Error('network failed'))
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'error', info: 'network failed' })
    })

    it('emits error info as string when error has no message', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'error')[1]
      handler('raw error string')
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'error', info: 'raw error string' })
    })

    it('emits downloading progress', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'download-progress')[1]
      const progressInfo = { percent: 50, bytesPerSecond: 1024, total: 1000, transferred: 500 }
      handler(progressInfo)
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', { status: 'downloading', info: progressInfo })
    })

    it('emits downloaded event with release info', () => {
      const emit = vi.fn()
      initAutoUpdate(emit)
      const handler = (autoUpdater.on as any).mock.calls.find((c: any) => c[0] === 'update-downloaded')[1]
      handler({}, 'Release notes', 'v1.0.0', new Date('2024-01-01'), 'https://example.com/update')
      expect(emit).toHaveBeenCalledWith('UPDATE_STATUS', {
        status: 'downloaded',
        info: {
          releaseNotes: 'Release notes',
          releaseName: 'v1.0.0',
          releaseDate: new Date('2024-01-01'),
          updateURL: 'https://example.com/update',
        },
      })
    })
  })

  describe('checkForUpdates', () => {
    it('calls autoUpdater.checkForUpdates', () => {
      checkForUpdates()
      expect(autoUpdater.checkForUpdates).toHaveBeenCalledOnce()
    })
  })

  describe('quitAndInstall', () => {
    it('calls autoUpdater.quitAndInstall via setImmediate', () =>
      new Promise<void>((done) => {
        quitAndInstall()
        setImmediate(() => {
          expect(autoUpdater.quitAndInstall).toHaveBeenCalledOnce()
          done()
        })
      }))
  })
})
