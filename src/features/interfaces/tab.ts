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

  updateTitle(title: string): void;
  updateUrl(url: string): void;
  onFocus(): void;
  onBlur(): void;
}
