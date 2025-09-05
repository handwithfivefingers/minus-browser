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
  onBackward(): void;
  onForward(): void;
  onFocus(): void;
  onBlur(): void;
}

export interface ITabManager {
  tabs: Map<string, ITab>;
  index: number;
  getTabs: ITab[];
  getTab: (id: string) => ITab | boolean;
  createTab: (tab: Partial<ITab>) => void;
  updateTab: (id: string, tabParams: Partial<ITab>) => void;
  deleteTab: (id: string) => void;
}
