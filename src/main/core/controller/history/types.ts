import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

export interface IHistoryEntry {
  id: string
  url: string
  title: string
  favicon: string
  timestamp: number
  visitCount: number
}
export interface HistoryIPCChannel {
  [IPC_INVOKE_CHANNEL.GET_HISTORY]: () => IHistoryEntry[]
  [IPC_INVOKE_CHANNEL.SEARCH_HISTORY]: (query: string) => IHistoryEntry[]
  [IPC_INVOKE_CHANNEL.DELETE_HISTORY]: (id: string) => void
  [IPC_INVOKE_CHANNEL.CLEAR_HISTORY]: () => void
  [IPC_INVOKE_CHANNEL.GET_RECENT_HISTORY]: (limit: number) => IHistoryEntry[]
}
