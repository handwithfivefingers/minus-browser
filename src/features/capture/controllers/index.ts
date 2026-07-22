import { WebContentsView } from 'electron'

import { eventStore } from '~/main/core/stores'

import { capturePage } from '../services'

export class CaptureController {
  activeView: WebContentsView | null = null

  constructor() {
    eventStore.listen('viewChanges', (view: WebContentsView) => {
      this.activeView = view
    })
  }

  async capture(rect?: Electron.Rectangle) {
    const view = this.activeView
    if (!view) throw new Error('No active view')
    return capturePage(view.webContents, rect)
  }
}
