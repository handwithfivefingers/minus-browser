export interface IUserInterface {
  layout: string;
  mode: string;
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
