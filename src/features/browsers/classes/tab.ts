import { v7 as uuid_v7 } from "uuid";
import { ITab } from "../interfaces";

export class Tab implements ITab {
  id: string = uuid_v7();
  title: string = "New Tab";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = false;
  index: number;
  favicon: string = "";
  timestamp: number = Date.now();
  isBookmarked: boolean = false;
  cookies: Electron.Cookie[];
  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }

  updateTitle(title: string) {
    this.title = title;
  }

  updateUrl(url: string) {
    this.url = url;
  }

  updateTab(tab: Partial<ITab>) {
    Object.assign(this, tab);
  }

  onFocus() {
    this.isFocused = true;
  }
  onBlur() {
    this.isFocused = false;
  }
}
