import { BrowserWindow, clipboard, dialog, Menu, MenuItem } from 'electron'
import path from 'node:path'

import { downloadController } from '~/features/download'

function extractImageName(srcURL: string): string {
  try {
    const url = new URL(srcURL)
    const basename = path.basename(decodeURIComponent(url.pathname))
    if (basename && basename !== '/') return basename
  } catch {
    // fall through
  }
  return `image-${Date.now()}`
}

async function saveImageAs(wc: Electron.WebContents, srcURL: string) {
  const parent = BrowserWindow.fromWebContents(wc) || BrowserWindow.getFocusedWindow()
  if (!parent) return
  const filename = extractImageName(srcURL)
  const result = await dialog.showSaveDialog(parent, {
    title: 'Save Image As',
    defaultPath: filename,
    buttonLabel: 'Save',
  })
  if (result.canceled || !result.filePath) return
  // Re-download the image to the chosen path; the download controller applies
  // the path and tracks the item exactly once via its will-download handler.
  downloadController.setDeferredSavePath(wc, srcURL, result.filePath)
  wc.downloadURL(srcURL)
}

export class ContextMenuController {
  template: any[] | undefined
  initialize(event: Electron.Event, params: Electron.ContextMenuParams, webContents?: Electron.WebContents) {
    const template: Partial<MenuItem>[] = [
      { label: 'Cut', role: 'cut' },
      { label: 'Copy', role: 'copy' },
    ]
    if (params.isEditable) {
      template.push({ label: 'Paste', role: 'paste' })
    }
    if (params.selectionText?.trim()) {
      template.push({
        label: 'Translate Selection',
        click: () => {
          const window = BrowserWindow.getFocusedWindow()
          window?.webContents?.send('TRANSLATE_SELECTION_AVAILABLE', {
            text: params.selectionText.trim(),
          })
        },
      })
    }

    template.push({ type: 'separator' })

    template.push(
      {
        label: 'Capture Page',
        click: () => {
          const window = BrowserWindow.getFocusedWindow()
          window?.webContents?.send('CAPTURE_PAGE', {})
        },
      },
      {
        label: 'Capture Selection',
        click: () => {
          const window = BrowserWindow.getFocusedWindow()
          window?.webContents?.send('CAPTURE_SELECTION', {})
        },
      }
    )

    template.push({ type: 'separator' })

    if (params.mediaType === 'image') {
      template.unshift({
        label: 'Save Image As...',
        click: () => {
          // Electron's context-menu event has no `.sender`, so the tab passes
          // its webContents explicitly instead of relying on event.sender.
          const wc = webContents ?? (event as any).sender
          saveImageAs(wc, params.srcURL)
        },
      })
    }
    if (params.linkURL) {
      template.unshift(
        {
          label: 'Open Link in New Window',
          click: () => {
            const window = BrowserWindow.getFocusedWindow()
            window?.webContents?.send('CREATE_TAB', { url: params.linkURL })
          },
        },
        {
          label: 'Copy Link Address',
          click: () => {
            return clipboard.writeText(params.linkURL)
          },
        }
      )
    }

    const menu = Menu.buildFromTemplate(template as any)
    menu.popup({ window: BrowserWindow.getFocusedWindow() as BrowserWindow })
  }
}
