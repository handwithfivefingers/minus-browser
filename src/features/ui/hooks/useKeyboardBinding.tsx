import { useEffect, useMemo } from "react";

interface IEventModel<T> {
  channel: string;
  data: T;
}
class EventModel<T> {
  channel: string;
  data: T;
  constructor(props: EventModel<T>) {
    Object.assign(this, props);
  }
}
class KeyboardBinding {
  isSearchPage = false;
  constructor() {}

  onSearchPage() {
    this.isSearchPage = !this.isSearchPage;
    const event = new EventModel({ channel: "SEARCH", data: { open: this.isSearchPage } });
    return this.onEmit(event);
  }

  onInvoke<T>(e: EventModel<T>) {
    return window.api.INVOKE(e.channel, e.data);
  }
  onListen<T>(e: EventModel<T>) {
    return window.api.LISTENER(e.channel, (value: T) => {
      return value;
    });
  }
  onEmit<T>(e: EventModel<T>) {
    return window.api.EMIT(e.channel, e.data);
  }
}

export const useKeyboardBinding = () => {
  const keyboardBinding = useMemo(() => {
    return new KeyboardBinding();
  }, []);

  // useEffect(() => {
  //   if (!keyboardBinding) return;
  //   const handleSearch = (e: KeyboardEvent) => {
  //     if (e.key.toLowerCase() === "f" && (e.ctrlKey || e.metaKey)) {
  //       keyboardBinding.onSearchPage();
  //     }
  //   };
  //   window.addEventListener("keydown", handleSearch, true);
  //   return () => {
  //     window.removeEventListener("keydown", handleSearch);
  //   };
  // }, [keyboardBinding]);

  return keyboardBinding;
};
