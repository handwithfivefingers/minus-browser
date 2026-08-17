// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockElectron, mockWebContents, mockDownloadController } = vi.hoisted(() => {
  const mockWebContents = {
    downloadURL: vi.fn(),
  }

  const mockDownloadController = {
    setDeferredSavePath: vi.fn(),
  }

  const mockElectron = {
    BrowserWindow: {
      getFocusedWindow: vi.fn(() => ({})),
      fromWebContents: vi.fn(() => ({})),
    },
    clipboard: { writeText: vi.fn() },
    dialog: { showSaveDialog: vi.fn() },
    Menu: {
      buildFromTemplate: vi.fn(() => ({ popup: vi.fn() })),
      setApplicationMenu: vi.fn(),
    },
    MenuItem: vi.fn(),
  }

  return { mockElectron, mockWebContents, mockDownloadController }
})

vi.mock('electron', () => mockElectron)

vi.mock('~/features/download', () => ({
  downloadController: mockDownloadController,
}))

import { ContextMenuController } from '../contextMenuController'

describe('ContextMenuController — Save Image As', () => {
  beforeEach(() => {
    mockElectron.dialog.showSaveDialog.mockReset()
    mockElectron.dialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/pics/photo.png' })
    mockWebContents.downloadURL.mockClear()
    mockDownloadController.setDeferredSavePath.mockClear()
  })

  it('downloads the image to the chosen path instead of copying the URL', async () => {
    const controller = new ContextMenuController()
    const params = {
      isEditable: false,
      selectionText: '',
      mediaType: 'image',
      srcURL: 'https://example.com/images/photo.png',
      linkURL: '',
    }

    controller.initialize({} as unknown as Electron.Event, params as Electron.ContextMenuParams, mockWebContents)

    // the template was built — grab the click handler for "Save Image As..."
    const buildArgs = mockElectron.Menu.buildFromTemplate.mock.calls[0][0] as any[]
    const saveImage = buildArgs.find((item) => item.label === 'Save Image As...')
    expect(saveImage).toBeDefined()

    await saveImage.click()

    expect(mockElectron.dialog.showSaveDialog).toHaveBeenCalled()
    expect(mockDownloadController.setDeferredSavePath).toHaveBeenCalledWith(
      mockWebContents,
      'https://example.com/images/photo.png',
      '/pics/photo.png'
    )
    expect(mockWebContents.downloadURL).toHaveBeenCalledWith('https://example.com/images/photo.png')
    expect(mockElectron.clipboard.writeText).not.toHaveBeenCalled()
  })

  it('does nothing when the save dialog is cancelled', async () => {
    mockElectron.dialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined })
    const controller = new ContextMenuController()
    const params = {
      isEditable: false,
      selectionText: '',
      mediaType: 'image',
      srcURL: 'https://example.com/images/photo.png',
      linkURL: '',
    }

    controller.initialize({} as unknown as Electron.Event, params as Electron.ContextMenuParams, mockWebContents)
    const buildArgs = mockElectron.Menu.buildFromTemplate.mock.calls[0][0] as any[]
    const saveImage = buildArgs.find((item) => item.label === 'Save Image As...')
    await saveImage.click()

    expect(mockWebContents.downloadURL).not.toHaveBeenCalled()
    expect(mockDownloadController.setDeferredSavePath).not.toHaveBeenCalled()
  })
})
