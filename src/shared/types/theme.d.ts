export interface IUserInterface {
  layout: string;
  mode: string;
  savedCookies?: "0" | "1";
  dataSync: {
    intervalTime: string;
    hardwareAcceleration: string;
  };
  extension: {
    adblock: boolean;
    vault: boolean;
    translate: boolean;
    userscript: boolean;
    disabledFilters: string[];
  };
  historyRetentionDays?: string;
  hibernateMode?: "fast" | "normal" | "slow" | "custom";
  hibernateCustomMinutes?: number;
}
