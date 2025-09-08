declare global {
  interface Window {
    api: {
      INVOKE: <T>(channel: string, data?: any) => Promise<T> | T;
      EMIT: <T>(channel: string, data?: any) => Promise<T> | T;
      LISTENER: (channel: string, func: (...args: any[]) => void) => void;
    };
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
