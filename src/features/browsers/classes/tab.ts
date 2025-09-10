import { v4 as uuid_v4 } from "uuid";
import { ITab } from "../interfaces";

export class Tab implements ITab {
  id: string = uuid_v4();
  title: string = "New Tab";
  url: string = "https://google.com";
  isPinned: boolean = false;
  isFocused: boolean = false;
  index: number;
  favicon: string = "";

  constructor(props: Partial<ITab>) {
    Object.assign(this, props);
  }

  updateTitle(title: string) {
    this.title = title;
  }

  updateUrl(url: string) {
    this.url = url;
  }

  onFocus() {
    this.isFocused = true;
  }
  onBlur() {
    this.isFocused = false;
  }
}
