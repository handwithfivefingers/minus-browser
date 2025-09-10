export interface IElectronAPI {
  INVOKE: <T>(channel: string, data?: any) => Promise<T> | T;
  EMIT: <T>(channel: string, data?: any) => Promise<T> | T;
  LISTENER: (channel: string, func: (...args: any[]) => void) => Promise<T> | T;
}
declare global {
  interface Window {
    api: IElectronAPI;
  }
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
