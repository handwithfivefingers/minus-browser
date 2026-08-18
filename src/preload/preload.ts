// eslint-disable-next-line @typescript-eslint/ban-ts-comment
import { contextBridge, ipcRenderer } from 'electron'

import log from 'electron-log'

import { IPC_EMIT_CHANNEL, IPC_INVOKE_CHANNEL, IPCRendererEventChannel } from '../shared/constants/ipc'

log.initialize()
type IChannel = keyof typeof IPC_INVOKE_CHANNEL | keyof typeof IPC_EMIT_CHANNEL

type ListenChannelEvent = IPCRendererEventChannel | '' | string

class IPCEvent<T = any> {
  data: T | null = null
  channel: IChannel | null = null
  constructor(props: IPCEvent) {
    Object.assign(this, props)
  }
}

contextBridge.exposeInMainWorld('api', {
  INVOKE: (channel: IChannel, data?: any) => {
    const ipcEvent = new IPCEvent({ channel, data })
    return ipcRenderer.invoke('invoke', ipcEvent)
  },
  EMIT: <T>(channel: IChannel, data?: T) => {
    const ipcEvent = new IPCEvent({ channel, data })
    return ipcRenderer.send('send', ipcEvent)
  },
  LISTENER: (channel: ListenChannelEvent, callback?: any) => {
    const handler = (_event: Electron.IpcRendererEvent, value: any) => callback(value)
    ipcRenderer.on(channel, handler)
    // Return an unsubscribe function so repeatedly-mounted views (e.g. the
    // sub-window overlays) can clean up instead of leaking ipcRenderer.on
    // listeners on every mount.
    return () => ipcRenderer.off(channel, handler)
  },
})
