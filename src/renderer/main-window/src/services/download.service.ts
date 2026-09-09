import { IPC_DOWNLOAD_INVOKE, IPC_DOWNLOAD_RENDERER_EVENT } from '~/shared/constants/ipc'
import { DownloadItem } from '~/shared/types/download'

export const downloadService = {
  updatedItems: (callback: (item: DownloadItem) => void) => {
    return window.api.LISTENER(IPC_DOWNLOAD_RENDERER_EVENT.ITEM_UPDATED, callback as (...args: unknown[]) => void)
  },
  subscribeItems: (callback: (items: DownloadItem[]) => void) => {
    return window.api.LISTENER(IPC_DOWNLOAD_RENDERER_EVENT.LIST_CHANGED, callback as (...args: unknown[]) => void)
  },
  getAll: async (): Promise<DownloadItem[]> => {
    return window.api.INVOKE<DownloadItem[]>(IPC_DOWNLOAD_INVOKE.GET_ALL)
  },
  clearAll: async () => {
    return window.api.INVOKE(IPC_DOWNLOAD_INVOKE.CLEAR)
  },
}
