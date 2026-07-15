// @ts-nocheck
import { contextBridge, ipcRenderer } from "electron";
import log from "electron-log";
import {
  IPC_EMIT_CHANNEL,
  IPC_INVOKE_CHANNEL,
  IPCRendererEventChannel,
} from "../shared/constants/ipc";

log.initialize();
type IChannel =
  | (typeof IPC_INVOKE_CHANNEL)[keyof typeof IPC_INVOKE_CHANNEL]
  | (typeof IPC_EMIT_CHANNEL)[keyof typeof IPC_EMIT_CHANNEL];

type ListenChannelEvent = IPCRendererEventChannel | "" | string;

class IPCEvent<T = any> {
  channel: IChannel;
  data: T | null = null;
  constructor(props: IPCEvent) {
    Object.assign(this, props);
  }
}

contextBridge.exposeInMainWorld("api", {
  INVOKE: (channel: IChannel, data?: any) => {
    const ipcEvent = new IPCEvent({ channel, data });
    return ipcRenderer.invoke("invoke", ipcEvent);
  },
  EMIT: <T>(channel: IChannel, data?: T) => {
    const ipcEvent = new IPCEvent({ channel, data });
    return ipcRenderer.send("send", ipcEvent);
  },
  LISTENER: (channel: ListenChannelEvent, callback?: any) =>
    ipcRenderer.on(channel, (_event, value) => callback(value)),
});
