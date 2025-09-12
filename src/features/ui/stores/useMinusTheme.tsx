import { create } from "zustand";
import { IMinusThemeStore } from "~/features/ui/interfaces";

const useMinusThemeStore = create<IMinusThemeStore>((set, get) => ({
  layout: "FLOATING",
  mode: "light",
  dataSync: {
    intervalTime: "15",
  },
  setLayout: (layout: "BASIC" | "FLOATING") => {
    set((state) => {
      return { layout };
    });
  },
  setMode: (mode: "light" | "dark") => {
    set((state) => {
      return { mode };
    });
  },
  setDataSyncTime: (intervalTime: string) => {
    set(() => {
      return { dataSync: { intervalTime } };
    });
  },
  initialize: (data: Partial<IMinusThemeStore>) => {
    return set((state) => {
      return data;
    });
  },
}));

export { useMinusThemeStore };
