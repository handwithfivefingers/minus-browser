import { BrowserWindow, dialog } from 'electron'

import { IPC_DOWNLOAD_INVOKE } from '~/shared/constants/ipc/download'

import { downloadController } from './controller'

export const downloadInvokeHandlers: Record<string, (data?: any) => any> = {
  [IPC_DOWNLOAD_INVOKE.GET_ALL]: () => downloadController.getAll(),
  [IPC_DOWNLOAD_INVOKE.PAUSE]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.pause(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.RESUME]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.resume(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.CANCEL]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.cancel(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.OPEN]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.open(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.SHOW_IN_FOLDER]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.showInFolder(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.REMOVE]: (data?: { id?: string }) => {
    if (!data?.id) return { success: false }
    return downloadController.remove(data.id)
  },
  [IPC_DOWNLOAD_INVOKE.CLEAR]: () => downloadController.clear(),
  [IPC_DOWNLOAD_INVOKE.GET_DEFAULT_DIR]: () => downloadController.getDefaultDir(),
  [IPC_DOWNLOAD_INVOKE.SET_DEFAULT_DIR]: async () => {
    const win = BrowserWindow.getFocusedWindow() || undefined
    try {
      const result = await dialog.showOpenDialog(win as BrowserWindow, {
        title: 'Choose Download Location',
        defaultPath: downloadController.getDefaultDir(),
        properties: ['openDirectory', 'createDirectory'],
      })
      if (result.canceled || !result.filePaths?.[0]) {
        return { success: false }
      }
      const directory = result.filePaths[0]
      downloadController.setPreferences({ downloadDirectory: directory })
      return { success: true, directory }
    } catch {
      return { success: false }
    }
  },
}
