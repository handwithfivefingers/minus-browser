export interface ITab {
  id?: string;
  title: string;
  url: string;
  index: number;
  isPinned: boolean;
  isFocused: boolean;
  favicon?: string;
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

export interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  tabsIndex: { [key: string]: number };
  initialize: ({ tabs }: { tabs: ITab[] }) => void;
  getTabById: (id: string) => Tab | null;
  addNewTab: (tab?: Partial<Tab>) => void;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  closeTab: (tab: Tab) => { nextIndex: number | undefined; nextTab: Tab | undefined };
}
