export interface ITab {
  id?: string;
  title: string;
  url: string;
  index: number;
  isPinned: boolean;
  isFocused: boolean;
  favicon?: string;
  memoryUsage?: {
    workingSetSize: 0;
    peakWorkingSetSize: 0;
    privateBytes: 0;
    sharedBytes: 0;
  };
  cpuUsage?: {
    percentCPUUsage: 0;
    idleWakeupsPerSecond: 0;
  };
  updateTitle(title: string): void;
  updateUrl(url: string): void;
  onFocus(): void;
  onBlur(): void;
}

export interface ITabManager {
  tabs: Map<string, ITab>;
  index: number;
  getTabs: ITab[];
  getTab: (id: string) => ITab | boolean;
  createTab: (tab: Partial<ITab>) => void;
  updateTab: (params: Partial<ITab> & { id: string }) => void;
  deleteTab: (id: string) => void;
}
