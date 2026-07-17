export type ThemeMode = "light" | "dark" | "auto";

export interface IUserInterface {
  layout: string;
  mode: ThemeMode;
  savedCookies?: "0" | "1";
  extension: {
    adblock: boolean;
    vault: boolean;
    translate: boolean;
    userscript: boolean;
    cosmeticFiltering: boolean;
    disabledFilters: string[];
    customFilters: string[];
    adblockAutoUpdate: boolean;
    adblockAutoUpdateInterval: number;
  };
  historyRetentionDays?: string;
  hibernateMode?: "fast" | "normal" | "slow" | "custom";
  hibernateCustomMinutes?: number;
  autoDownload?: boolean;
  notificationRetentionDays?: string;
}
