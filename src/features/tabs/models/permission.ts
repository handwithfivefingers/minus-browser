import { BrowserWindow } from 'electron'

import { ITab } from '~/shared/types'
import { isSafeUrl } from '~/shared/utils'

export interface WindowOpenRequest {
  url: string
  frameName: string
  disposition: string
}

export class TabPermission {
  isMuted = false
  isUsingCamera = false
  isUsingMicrophone = false
  isUsingScreenShare = false
  blockedNotifications = 0
  blockedPopups = 0
  /** Installed by the window controller to apply the popup-blocker policy.
   *  When set, the controller is responsible for resolving the popup (e.g. by
   *  opening it as a tab) — the WebContents handler always denies the raw
   *  window, otherwise the request would escape as a real popup. */
  onWindowOpen?: (request: WindowOpenRequest) => void
  constructor(props: Partial<ITab>) {
    Object.assign(this, props)
  }
  registerMediaEvents(
    webContents: Electron.WebContents,
    callback: (params: { isUsingCamera: boolean; isUsingMicrophone: boolean; isUsingScreenShare: boolean }) => void
  ) {
    if (!webContents) return
    webContents.ipc.on('MEDIA_STATE_CHANGED', (_event, data) => {
      this.isUsingCamera = data.isUsingCamera
      this.isUsingMicrophone = data.isUsingMicrophone
      this.isUsingScreenShare = data.isUsingScreenShare
      callback({
        isUsingCamera: this.isUsingCamera,
        isUsingMicrophone: this.isUsingMicrophone,
        isUsingScreenShare: this.isUsingScreenShare,
      })
    })
  }
  requestPermissions(webContents: Electron.WebContents) {
    if (!webContents) return
    webContents.setWindowOpenHandler(({ url, frameName, disposition }) => {
      try {
        if (!isSafeUrl(url)) return { action: 'deny' }
        if (this.onWindowOpen) {
          // Policy lives in the window controller; it opens allowed popups as
          // tabs itself. Always deny the raw window here.
          this.onWindowOpen({ url, frameName, disposition })
          return { action: 'deny' }
        }
        const browserView = BrowserWindow.getFocusedWindow()
        browserView?.webContents?.send('CREATE_TAB', { url: url })
        return { action: 'deny' }
      } catch (error) {
        return { action: 'deny' }
      }
    })
  }
}
