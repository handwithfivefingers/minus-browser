type IChannel = "Invoke" | "Send" | "Callback";

export class IPCEvent<T = any> {
  channel: IChannel;
  data: T | null = null;
  constructor(props: IPCEvent) {
    Object.assign(this, props);
  }
}
