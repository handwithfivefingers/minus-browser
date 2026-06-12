export interface ITab {
  id?: string;
  title: string;
  url: string;
  index: number;
  isPinned: boolean;
  isFocused: boolean;
  favicon?: string;
  cookies?: any[];
  isBookmarked?: boolean;
  audible: boolean;
  isLoading?: boolean;
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
