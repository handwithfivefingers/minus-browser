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
  memoryUsage: {
    workingSetSize: 0;
    peakWorkingSetSize: 0;
    privateBytes: 0;
    sharedBytes: 0;
  };
  cpuUsage: {
    percentCPUUsage: 0;
    idleWakeupsPerSecond: 0;
  };

  constructor({ memoryUsage, cpuUsage, ...props }: Partial<ITab>) {
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
