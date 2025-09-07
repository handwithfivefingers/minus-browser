import { contextBridge, ipcRenderer } from "electron";
enum TabEventType {
  CREATE_TAB = "CREATE_TAB",
  UPDATE_TAB = "UPDATE_TAB",
  DELETE_TAB = "DELETE_TAB",
  SELECT_TAB = "SELECT_TAB",
  FOCUS_TAB = "FOCUS_TAB",
  BLUR_TAB = "BLUR_TAB",
  BACKWARD_TAB = "BACKWARD_TAB",
  FORWARD_TAB = "FORWARD_TAB",
  GET_TABS = "GET_TABS",
  GET_TAB = "GET_TAB",
  TOGGLE_DEV_TOOLS = "TOGGLE_DEV_TOOLS",
  ON_RELOAD = "ON_RELOAD",
  ON_CLOSE_TAB = "ON_CLOSE_TAB",
}

enum ViewEventType {
  SHOW_VIEW_BY_ID = "SHOW_VIEW_BY_ID",
  VIEW_RESPONSIVE = "VIEW_RESPONSIVE",
  SHOW_VIEW = "SHOW_VIEW",
  HIDE_VIEW = "HIDE_VIEW",
  UPDATE_VIEW_SIZE = "UPDATE_VIEW_SIZE",
  VIEW_CHANGE_URL = "VIEW_CHANGE_URL",
}

enum TAB_UPDATE_TYPE {
  TAB_UPDATED_TITLE = "TAB_UPDATED_TITLE",
  TAB_UPDATED_URL = "TAB_UPDATED_URL",
  TAB_UPDATED_FAVICON = "TAB_UPDATED_FAVICON",
  TAB_UPDATED = "TAB_UPDATED",
}
type IChannel = TabEventType | ViewEventType | TAB_UPDATE_TYPE;

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
    const ipcEvent = new IPCEvent({ channel, data: { channel, data } });
    return ipcRenderer.send("send", ipcEvent);
  },
  LISTENER: (channel: string, callback?: any) => ipcRenderer.on(channel, (_event, value) => callback(value)),
});

// window.addEventListener("load", () => {
//   const youtubeAds = /ytp-ad-(btn|text)/;
// });
