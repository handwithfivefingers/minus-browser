export interface IMinusThemeStore {
  layout: "BASIC" | "FLOATING";
  mode: "light" | "dark";
  dataSync: {
    intervalTime: string;
  };

  setLayout: (layout: "BASIC" | "FLOATING") => void;
  setMode: (mode: "light" | "dark") => void;
  setDataSyncTime: (intervalTime: string) => void;
  initialize: (data: Partial<IMinusThemeStore>) => void;
}
