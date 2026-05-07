export interface MinusThemeState {
  layout: "BASIC" | "FLOATING";
  mode: "light" | "dark";
  dataSync: {
    intervalTime: string;
  };
}
export interface MinusThemeAction {
  setLayout: (layout: "BASIC" | "FLOATING") => void;
  setMode: (mode: "light" | "dark") => void;
  setDataSyncTime: (intervalTime: string) => void;
  initialize: (data: Partial<IMinusThemeStore>) => void;
}
export interface IMinusThemeStore extends MinusThemeState, MinusThemeAction {
}
