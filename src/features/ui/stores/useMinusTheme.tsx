import { create } from "zustand";
import { IMinusThemeStore } from "~/features/ui/interfaces";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";

const useMinusThemeStore = create<IMinusThemeStore>((set, get) => ({
  layout: "FLOATING",
  mode: "light",
  dataSync: {
    intervalTime: "15",
    hardwareAcceleration: "on",
  },
  extension: {
    adblock: true,
    vault: true,
    translate: true,
    userscript: true,
    disabledFilters: [],
  },
  historyRetentionDays: "30",
  hibernateMode: "normal",
  hibernateCustomMinutes: 60,
  setLayout: (layout: "BASIC" | "FLOATING") => {
    set({ layout });
  },
  setMode: (mode: "light" | "dark") => {
    set({ mode });
  },
  setCookieMode: (mode: "0" | "1") => {
    set({ savedCookies: mode });
  },
  setDataSyncTime: (intervalTime: string) => {
    set((state) => ({ ...state, dataSync: { ...state.dataSync, intervalTime } }));
  },
  setExtension: (extension: Partial<IMinusThemeStore["extension"]>) => {
    set((state) => ({ ...state, extension: { ...state.extension, ...extension } }));
  },
  setHistoryRetentionDays: (days: string) => {
    set({ historyRetentionDays: days });
  },
  setHibernateMode: (mode: "fast" | "normal" | "slow" | "custom") => {
    set({ hibernateMode: mode });
  },
  setHibernateCustomMinutes: (minutes: number) => {
    set({ hibernateCustomMinutes: minutes });
  },
  initialize: (data: Partial<IMinusThemeStore>) => {
    return set(data);
  },
  saved: () => {
    const data = get();
    const params = {
      layout: data.layout,
      mode: data.mode,
      dataSync: data.dataSync,
      extension: data.extension,
      savedCookies: data.savedCookies,
      historyRetentionDays: data.historyRetentionDays,
      hibernateMode: data.hibernateMode,
      hibernateCustomMinutes: data.hibernateCustomMinutes,
    };
    window?.api?.INVOKE(IPC_INVOKE_CHANNEL.INTERFACE_SAVE, params);
  },
}));

export { useMinusThemeStore };
