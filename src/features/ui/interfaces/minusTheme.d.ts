import { IUserInterface } from "~/shared/types";

export interface MinusThemeAction {
  setLayout: (layout: "BASIC" | "FLOATING") => void;
  setMode: (mode: "light" | "dark") => void;
  setDataSyncTime: (intervalTime: string) => void;
  initialize: (data: Partial<IUserInterface>) => void;
  setExtension: (extension: Partial<IUserInterface["extension"]>) => void;
  setCookieMode: (mode: "0" | "1") => void;
  saved: () => void;
}
export interface IMinusThemeStore extends IUserInterface, MinusThemeAction {}
