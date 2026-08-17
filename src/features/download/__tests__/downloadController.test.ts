// @vitest-environment node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface FakeRow {
  id: string
  filename: string
  url: string
  save_path: string
  mime_type: string
  total_bytes: number
  received_bytes: number
  state: string
  started_at: number
  ended_at: number
}

const { mockDb, mockElectron, mockHandlers, mockPopup, rows } = vi.hoisted(() => {
  const rows: FakeRow[] = []

  const mockDb = {
    query: vi.fn((sql: string, params: any[] = []) => {
      if (sql.includes('LIMIT -1 OFFSET')) return [] // history cap cleanup — never exceeded in tests
      if (sql.includes('FROM downloads ORDER BY started_at DESC LIMIT')) {
        return [...rows].sort((a, b) => b.started_at - a.started_at)
      }
      return []
    }),
    get: vi.fn((sql: string, params: any[] = []) => {
      if (sql.startsWith('SELECT save_path')) return rows.find((r) => r.id === params[0])
      return undefined
    }),
    run: vi.fn((sql: string, params: any[] = []) => {
      if (sql.includes('INSERT OR REPLACE INTO downloads')) {
        const [id, filename, url, save_path, mime_type, total_bytes, received_bytes, state, started_at, ended_at] =
          params as unknown[]
        const idx = rows.findIndex((r) => r.id === id)
        const row: FakeRow = {
          id: id as string,
          filename: filename as string,
          url: url as string,
          save_path: save_path as string,
          mime_type: mime_type as string,
          total_bytes: total_bytes as number,
          received_bytes: received_bytes as number,
          state: state as string,
          started_at: started_at as number,
          ended_at: ended_at as number,
        }
        if (idx >= 0) rows[idx] = row
        else rows.push(row)
      } else if (sql.startsWith('DELETE FROM downloads')) {
        if (sql.includes('WHERE id = ?')) {
          const id = params[0]
          const idx = rows.findIndex((r) => r.id === id)
          if (idx >= 0) rows.splice(idx, 1)
        } else {
          rows.length = 0
        }
      }
    }),
    transaction: vi.fn(),
  }

  const mockElectron = {
    app: { getPath: vi.fn(() => '/tmp/Downloads') },
    dialog: { showSaveDialog: vi.fn() },
    shell: {
      openPath: vi.fn(),
      showItemInFolder: vi.fn(),
    },
    BrowserWindow: { getFocusedWindow: vi.fn(() => null), fromWebContents: vi.fn(() => null) },
  }

  const mockHandlers: Record<string, (...args: any[]) => void> = {}
  const mockPopup = {
    send: vi.fn(),
    notify: vi.fn(),
    show: vi.fn(),
    hide: vi.fn(),
    dismiss: vi.fn(),
    init: vi.fn(),
  }
  return { mockDb, mockElectron, mockHandlers, mockPopup, rows }
})

vi.mock('electron', () => mockElectron)

vi.mock('~/main/core/services/session', () => ({
  browserSession: {
    on: vi.fn((name: string, handler: (...args: any[]) => void) => {
      mockHandlers[name] = handler
    }),
  },
}))

vi.mock('~/features/download/popup', () => ({ downloadPopup: mockPopup }))

vi.mock('~/main/core/stores/database', () => ({ appDb: mockDb }))

vi.mock('~/main/core/stores', async (importOriginal) => {
  const original = await importOriginal()
  return { ...(original as any), appDb: mockDb }
})

import { IPC_DOWNLOAD_RENDERER_EVENT } from '~/shared/constants/ipc/download'

import { downloadController } from '../controller'

function createDownloadItem(overrides: Record<string, unknown> = {}) {
  let received = 0
  let total = 100
  let paused = false
  let savePath = '/tmp/Downloads/file.bin'
  const listeners: Record<string, (...args: any[]) => void> = {}
  const item = {
    getFilename: vi.fn(() => 'file.bin'),
    getURL: vi.fn(() => 'https://example.com/file.bin'),
    getSavePath: vi.fn(() => savePath),
    getMimeType: vi.fn(() => 'application/octet-stream'),
    getTotalBytes: vi.fn(() => total),
    getReceivedBytes: vi.fn(() => received),
    canResume: vi.fn(() => true),
    isPaused: vi.fn(() => paused),
    pause: vi.fn(() => {
      paused = true
    }),
    resume: vi.fn(() => {
      paused = false
    }),
    cancel: vi.fn(),
    setSavePath: vi.fn((p: string) => {
      savePath = p
    }),
    on: vi.fn((name: string, cb: (...args: any[]) => void) => {
      listeners[name] = cb
    }),
    ...overrides,
  }
  return {
    item,
    listeners,
    setProgress: (r: number, t: number) => {
      received = r
      total = t
    },
  }
}

function getWillDownloadHandler() {
  const handler = mockHandlers['will-download']
  expect(handler).toBeDefined()
  return handler
}

describe('downloadController', () => {
  beforeEach(() => {
    rows.length = 0
    mockDb.run.mockClear()
    mockDb.get.mockClear()
    mockElectron.dialog.showSaveDialog.mockReset()
    mockElectron.shell.openPath.mockClear()
    mockElectron.shell.showItemInFolder.mockClear()
    mockPopup.send.mockClear()
    mockPopup.notify.mockClear()
    mockPopup.show.mockClear()
    mockPopup.hide.mockClear()
    downloadController.setMainWindow(null)
    downloadController.setPreferences({})
    downloadController.init()
    downloadController.clear()
    mockDb.run.mockClear()
  })

  it('tracks a download from start to completion and persists it', () => {
    const handler = getWillDownloadHandler()
    const { item, listeners, setProgress } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item, {})

    let all = downloadController.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      filename: 'file.bin',
      url: 'https://example.com/file.bin',
      state: 'progressing',
      progress: 0,
    })

    // the popup is broadcast to and shown for active downloads
    expect(mockPopup.send).toHaveBeenCalledWith(IPC_DOWNLOAD_RENDERER_EVENT.ITEM_UPDATED, expect.any(Object))
    expect(mockPopup.notify).toHaveBeenCalled()

    // progress updates
    setProgress(50, 100)
    listeners['updated']({}, 'progressing')
    all = downloadController.getAll()
    expect(all[0].receivedBytes).toBe(50)
    expect(all[0].progress).toBe(50)

    // completion persists + removes from active
    setProgress(100, 100)
    listeners['done']({}, 'completed')
    expect(mockDb.run).toHaveBeenCalled()
    const persisted = mockDb.run.mock.calls.find((c: any[]) => c[0]?.includes('INSERT OR REPLACE INTO downloads'))
    expect(persisted).toBeDefined()
    all = downloadController.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ state: 'completed', progress: 100, endedAt: expect.any(Number) })
  })

  it('marks interrupted downloads and keeps them in the list', () => {
    const handler = getWillDownloadHandler()
    const { item, listeners } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item, {})

    listeners['updated']({}, 'interrupted')
    listeners['done']({}, 'interrupted')

    const all = downloadController.getAll()
    expect(all[0].state).toBe('interrupted')
  })

  it('support pause / resume / cancel actions', () => {
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item, {})
    const id = downloadController.getAll()[0].id

    expect(downloadController.pause(id)).toEqual({ success: true })
    expect(item.pause).toHaveBeenCalled()
    expect(downloadController.getAll()[0].paused).toBe(true)

    expect(downloadController.resume(id)).toEqual({ success: true })
    expect(item.resume).toHaveBeenCalled()

    expect(downloadController.cancel(id)).toEqual({ success: true })
    expect(item.cancel).toHaveBeenCalled()
  })

  it('returns failure for unknown ids', () => {
    expect(downloadController.pause('nope')).toEqual({ success: false })
    expect(downloadController.resume('nope')).toEqual({ success: false })
    expect(downloadController.cancel('nope')).toEqual({ success: false })
  })

  it('opens and reveals completed files via shell', () => {
    const realPath = path.join(os.tmpdir(), `mb-dl-test-${Date.now()}.pdf`)
    fs.writeFileSync(realPath, 'x')
    rows.push({
      id: 'h1',
      filename: 'done.pdf',
      url: 'https://example.com/done.pdf',
      save_path: realPath,
      mime_type: 'application/pdf',
      total_bytes: 10,
      received_bytes: 10,
      state: 'completed',
      started_at: Date.now(),
      ended_at: Date.now(),
    })
    expect(downloadController.open('h1')).toEqual({ success: true })
    expect(mockElectron.shell.openPath).toHaveBeenCalledWith(realPath)
    expect(downloadController.showInFolder('h1')).toEqual({ success: true })
    expect(mockElectron.shell.showItemInFolder).toHaveBeenCalledWith(realPath)
    fs.unlinkSync(realPath)
  })

  it('remove cancels an active item and deletes history row', () => {
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item, {})
    const id = downloadController.getAll()[0].id

    expect(downloadController.remove(id)).toEqual({ success: true })
    expect(item.cancel).toHaveBeenCalled()
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM downloads WHERE id = ?', [id])
    expect(downloadController.getAll()).toHaveLength(0)
  })

  it('clear removes all active and history entries', () => {
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item, {})

    expect(downloadController.clear()).toEqual({ success: true })
    expect(item.cancel).toHaveBeenCalled()
    expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM downloads')
    expect(downloadController.getAll()).toHaveLength(0)
  })

  it('asks for a save location when askDownloadLocation is enabled', async () => {
    downloadController.setPreferences({ askDownloadLocation: true })
    const handler = getWillDownloadHandler()
    const preventDefault = vi.fn()
    const { item } = createDownloadItem()
    const webContents = {
      session: { once: vi.fn() },
      downloadURL: vi.fn(),
    }

    mockElectron.dialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    handler({ preventDefault }, item, webContents)
    await Promise.resolve()

    expect(preventDefault).toHaveBeenCalled()
    expect(mockElectron.dialog.showSaveDialog).toHaveBeenCalled()
    // user cancelled → nothing is tracked or re-downloaded
    expect(webContents.downloadURL).not.toHaveBeenCalled()
    expect(downloadController.getAll()).toHaveLength(0)
  })

  it('re-downloads to the chosen path when the save dialog is accepted', async () => {
    downloadController.setPreferences({ askDownloadLocation: true })
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()
    const webContents = {
      session: { once: vi.fn() },
      downloadURL: vi.fn(),
    }

    mockElectron.dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/custom/dir/file.bin' })
    handler({ preventDefault: vi.fn() }, item, webContents)
    await Promise.resolve()

    expect(webContents.downloadURL).toHaveBeenCalledWith('https://example.com/file.bin')

    // simulate the re-fired will-download → deferred path is applied and tracked once
    const { item: item2, listeners } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item2, webContents)
    expect(item2.setSavePath).toHaveBeenCalledWith('/custom/dir/file.bin')
    listeners['done']({}, 'completed')

    const all = downloadController.getAll()
    expect(all).toHaveLength(1)
    expect(all[0].savePath).toBe('/custom/dir/file.bin')
  })

  it('does not track the same DownloadItem twice', () => {
    downloadController.setPreferences({ askDownloadLocation: false })
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()

    handler({ preventDefault: vi.fn() }, item, {})
    // The same item surfacing through the session listener again (e.g. after a
    // deferred save-dialog re-download) must not create a duplicate entry.
    handler({ preventDefault: vi.fn() }, item, {})

    const all = downloadController.getAll()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({
      filename: 'file.bin',
      url: 'https://example.com/file.bin',
      state: 'progressing',
    })
  })

  it('does not double-track the deferred re-download when the item re-fires', async () => {
    downloadController.setPreferences({ askDownloadLocation: true })
    const handler = getWillDownloadHandler()
    const { item } = createDownloadItem()
    const webContents = {
      session: { once: vi.fn() },
      downloadURL: vi.fn(),
    }

    mockElectron.dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/custom/dir/file.bin' })
    handler({ preventDefault: vi.fn() }, item, webContents)
    await Promise.resolve()

    // Re-fire with the SAME item object twice, mimicking the deferred re-download
    // reaching the controller through both the once callback and the session
    // listener — only one tracked entry should result.
    const { item: item2 } = createDownloadItem()
    handler({ preventDefault: vi.fn() }, item2, webContents)
    handler({ preventDefault: vi.fn() }, item2, webContents)

    const all = downloadController.getAll()
    expect(all).toHaveLength(1)
  })
})
