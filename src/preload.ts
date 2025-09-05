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

interface IShowViewProps {
  id: string;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}
interface IViewChangeProps {
  id: string;
  url: string;
}

contextBridge.exposeInMainWorld("api", {
  SHOW_VIEW_BY_ID: (data: IShowViewProps) => ipcRenderer.send(ViewEventType.SHOW_VIEW_BY_ID, data),

  VIEW_CHANGE_URL: (data: IViewChangeProps) => ipcRenderer.send(ViewEventType.VIEW_CHANGE_URL, data),

  VIEW_TITLE_CHANGED: (callback: (value: { id: string; title: string }) => void) => {
    return ipcRenderer.on(TAB_UPDATE_TYPE.TAB_UPDATED_TITLE, (_event, value) => callback(value));
  },
  VIEW_URL_CHANGED: (callback: (value: { id: string; url: string }) => void) => {
    return ipcRenderer.on(TAB_UPDATE_TYPE.TAB_UPDATED_URL, (_event, value) => callback(value));
  },
  VIEW_FAVICON_CHANGED: (callback: (value: { id: string; favicon: string }) => void) => {
    return ipcRenderer.on(TAB_UPDATE_TYPE.TAB_UPDATED_FAVICON, (_event, value) => callback(value));
  },
  ON_TABS_UPDATED: (callback: (value: { id: string }) => void) => {
    return ipcRenderer.on(TAB_UPDATE_TYPE.TAB_UPDATED, (_event, value) => callback(value));
  },
  VIEW_RESPONSIVE: (data: IShowViewProps) => ipcRenderer.send(ViewEventType.VIEW_RESPONSIVE, data),
  VIEW_HIDE: (data: { id: string }) => ipcRenderer.send(ViewEventType.HIDE_VIEW, data),
  GET_TABS: () => ipcRenderer.invoke(TabEventType.GET_TABS),

  GET_TAB: (tabId: string) => ipcRenderer.invoke(TabEventType.GET_TAB, tabId),

  CREATE_TAB: () => ipcRenderer.invoke(TabEventType.CREATE_TAB),

  ON_RELOAD: (tabId: string) => ipcRenderer.send(TabEventType.ON_RELOAD, { id: tabId }),
  ON_CLOSE_TAB: (tabId: string) => ipcRenderer.send(TabEventType.ON_CLOSE_TAB, { id: tabId }),
  ON_BACKWARD: () => ipcRenderer.send(TabEventType.BACKWARD_TAB),
  ON_FORWARD: () => ipcRenderer.send(TabEventType.FORWARD_TAB),

  TOGGLE_DEV_TOOLS: (tabId: string) => ipcRenderer.send(TabEventType.TOGGLE_DEV_TOOLS, { id: tabId }),
});
