import { BrowserWindow } from 'electron'

import { ITab } from '~/shared/types'
import { isSafeUrl } from '~/shared/utils'

export interface WindowOpenRequest {
  url: string
  frameName: string
  disposition: string
}

/** Synchronous decision for a `window.open` request, returned from the popup
 *  policy and applied by the WebContents `setWindowOpenHandler`. */
export type WindowOpenResolution =
  { action: 'deny' } | { action: 'allow'; overrideBrowserWindowOptions?: Electron.BrowserWindowConstructorOptions }

/** OAuth providers (Google, Apple, GitHub, ...) bootstrap their sign-in popups
 *  with a blank window that they then navigate to the authorize URL. Those must
 *  be allowed through the popup handler, otherwise `window.open()` returns null
 *  and the sign-in flow (e.g. "Continue with Google" on ChatGPT) breaks. */
export function isBlankPopup(url: string): boolean {
  const trimmed = url.trim()
  return !trimmed || /^about:blank(#.*)?$/i.test(trimmed)
}

export class TabPermission {
  isMuted = false
  isUsingCamera = false
  isUsingMicrophone = false
  isUsingScreenShare = false
  blockedNotifications = 0
  blockedPopups = 0
  /** Installed by the window controller to apply the popup-blocker policy.
   *  The controller decides whether the request opens as a REAL popup window
   *  (needed for opener-based OAuth flows) or is denied. */
  onWindowOpen?: (request: WindowOpenRequest) => WindowOpenResolution
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
        // Blank windows are how OAuth providers bootstrap their sign-in popups
        // (open about:blank, then navigate to the authorize URL). Allow those
        // like any other popup instead of making window.open() return null.
        if (!isSafeUrl(url) && !isBlankPopup(url)) return { action: 'deny' }
        if (this.onWindowOpen) {
          // Policy lives in the window controller; it may allow the popup as a
          // real window (OAuth flows need window.opener) or deny it.
          return this.onWindowOpen({ url, frameName, disposition })
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
