import { EventEmitter } from "events";

class MinusEventEmitter<T> extends EventEmitter {
  eventListeners: Map<string, boolean> = new Map();
  constructor() {
    super();
    this.setMaxListeners(15);
  }
  broadcast<T>(key: string, value: T) {
    this.eventListeners.set(key, true);
    this.emit(key, value);
  }

  listen<T>(key: string, cb: (value: T) => void) {
    return this.on(key, cb);
  }
  destroy() {
    this.removeAllListeners();
  }
}

export const eventStore = new MinusEventEmitter();
