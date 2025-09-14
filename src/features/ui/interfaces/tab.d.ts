import { Tab } from "~/features/browsers/classes/tab";

export interface ITab {
  id?: string;
  title: string;
  url: string;
  index: number;
  isPinned: boolean;
  isFocused: boolean;
  favicon?: string;
  timestamp: number;
  updateTitle(title: string): void;
  updateUrl(url: string): void;
  onFocus(): void;
  onBlur(): void;
}
export interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  tabsIndex: { [key: string]: number };
  initialize: ({ tabs }: { tabs: ITab[] }) => void;
  getTabById: (id: string) => Tab | null;
  addNewTab: (tab?: Partial<Tab>) => Tab;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  closeTab: (tab: Tab) => { nextIndex: number | undefined; nextTab: Tab | undefined };
  sync: () => void;
}
