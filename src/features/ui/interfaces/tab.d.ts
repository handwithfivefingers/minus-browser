// // import { Tab } from "~/features/browsers/classes/tab";

// export interface ITab {
//   id?: string;
//   title: string;
//   url: string;
//   index: number;
//   isPinned: boolean;
//   isFocused: boolean;
//   favicon?: string;
//   timestamp: number;
//   updateTitle(title: string): void;
//   updateUrl(url: string): void;
//   onFocus(): void;
//   onBlur(): void;
// }

import { v7 as uuid_v7 } from "uuid";

export class Tab {
  id: string = uuid_v7();
  title: string = "New Tab";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = false;
  index: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;

  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }
}
export interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  setTabs: (tabs: Tab[]) => void;
  // tabsIndex: { [key: string]: number };
  // initialize: ({ tabs }: { tabs: Tab[] }) => void;
  // getTabById: (id: string) => Tab | null;
  // addNewTab: (tab?: Partial<Tab>) => Tab;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  sync: () => void;
  // closeTab: (tab: Tab) => {
  //   nextIndex: number | undefined;
  //   nextTab: Tab | undefined;
  // };
}
