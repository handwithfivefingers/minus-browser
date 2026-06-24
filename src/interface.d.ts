import type {
  IPCEmitChannel,
  IPCInvokeChannel,
  IPCRendererEventChannel,
} from "./features/browsers/constants/ipc";

type LISTENER_CHANNEL =
  | "LOADING"
  | "ON_RELOAD"
  | "TITLE_UPDATED"
  | "URL_CHANGED"
  | "SYNC"
  | "TOGGLE_DEV_TOOLS"
  | "GET_TABS"
  | "CREATE_TAB"
  | "FAVICON_UPDATED"
  | "SPOTLIGHT_OPEN"
  | "SPOTLIGHT_CLOSE"
  | "OPEN_TAB_BY_ID"
  | "NAVIGATE_HISTORY"
  | "GET_HISTORY"
  | "TAB_GROUP_UPDATED";

export interface IElectronAPI {
  INVOKE: <T>(channel: IPCInvokeChannel, data?: any) => Promise<T> | T;
  EMIT: <T>(channel: IPCEmitChannel, data?: any) => Promise<T> | T;
  LISTENER: <C extends LISTENER_CHANNEL, T>(
    channel: `${C}:${string}` | `${C}` | IPCRendererEventChannel | string,
    func: (...args: any[]) => void,
  ) => Promise<T> | T;
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

export interface IShowViewProps {
  id: string;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}
export interface IViewChangeProps {
  id: string;
  url: string;
}
