import { IPC_DOWNLOAD_INVOKE, IPC_DOWNLOAD_RENDERER_EVENT } from '~/shared/constants/ipc'
import { DownloadItem } from '~/shared/types/download'

export const downloadService = {
  updatedItems: () => {
    return new Promise<DownloadItem>((resolve) =>
      window.api.LISTENER(IPC_DOWNLOAD_RENDERER_EVENT.ITEM_UPDATED, (item: DownloadItem) => resolve(item))
    )
  },
  subscribeItems: () => {
    return new Promise<DownloadItem[]>((resolve) =>
      window.api.LISTENER(IPC_DOWNLOAD_RENDERER_EVENT.LIST_CHANGED, (items: DownloadItem[]) => resolve(items))
    )
  },
  getAll: async (): Promise<DownloadItem[]> => {
    return window.api.INVOKE<DownloadItem[]>(IPC_DOWNLOAD_INVOKE.GET_ALL)
  },
  clearAll: async () => {
    return window.api.INVOKE(IPC_DOWNLOAD_INVOKE.CLEAR)
  },
}
