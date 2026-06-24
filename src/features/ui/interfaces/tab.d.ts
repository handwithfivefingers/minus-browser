// // import { Tab } from "~/features/browsers/models/tab";

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
  audible: boolean = false;
  isLoading: boolean = false;
  preventHibernate: boolean = false;
  groupId?: string;
  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }
}
export interface TabStore {
  tabs: Tab[];
  activeTab: Tab | undefined | null;
  index: number;
  setTabs: (tabs: Tab[]) => void;
  updateTab: (id: string, tab: Partial<Tab>) => void;
  setActiveTab: (id: string) => void;
  sync: () => void;
}
