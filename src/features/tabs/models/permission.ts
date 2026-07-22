import { BrowserWindow } from 'electron'

import { ITab } from '~/shared/types'

export class TabPermission {
  isMuted = false
  isUsingCamera = false
  isUsingMicrophone = false
  isUsingScreenShare = false
  blockedNotifications = 0
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
    webContents.setWindowOpenHandler(({ url }) => {
      try {
        const browserView = BrowserWindow.getFocusedWindow()
        browserView?.webContents?.send('CREATE_TAB', { url: url })
        return { action: 'deny' }
      } catch (error) {
        return { action: 'deny' }
      }
    })
  }
}
