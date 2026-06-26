import { IUserInterface } from "~/shared/types";

export interface MinusThemeAction {
  setLayout: (layout: "BASIC" | "FLOATING") => void;
  setMode: (mode: "light" | "dark") => void;
  setDataSyncTime: (intervalTime: string) => void;
  initialize: (data: Partial<IUserInterface>) => void;
  setExtension: (extension: Partial<IUserInterface["extension"]>) => void;
  setCookieMode: (mode: "0" | "1") => void;
  setHistoryRetentionDays: (days: string) => void;
  setHibernateMode: (mode: "fast" | "normal" | "slow" | "custom") => void;
  setHibernateCustomMinutes: (minutes: number) => void;
  setAutoDownload: (enabled: boolean) => void;
  saved: () => void;
}
export interface IMinusThemeStore extends IUserInterface, MinusThemeAction {}
