interface Window {
  api: {
    INVOKE: <T>(channel: string, data?: any) => Promise<T>;
    EMIT: (channel: string, data?: any) => void;
    LISTENERS: (channel: string, func: (...args: any[]) => void) => void;
  };
}
