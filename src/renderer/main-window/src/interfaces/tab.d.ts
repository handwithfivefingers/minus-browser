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

import { v7 as uuid_v7 } from 'uuid'

export class Tab {
  id: string = uuid_v7()
  title = 'New Tab'
  url = 'https://google.com'
  isPinned = false
  isFocused = false
  index: number
  favicon = ''
  timestamp: number = Date.now()
  isBookmarked = false
  audible = false
  isMuted = false
  isUsingCamera = false
  isUsingMicrophone = false
  isUsingScreenShare = false
  blockedNotifications = 0
  isLoading = false
  preventHibernate = false
  groupId?: string
  error?: { code: string; description: string; url: string; httpResponseCode?: number; isCertError?: boolean } | null
  constructor(props: Partial<ITab>) {
    Object.assign(this, props)
  }
}
export interface TabStore {
  tabs: Tab[]
  activeTab: Tab | undefined | null
  index: number
  setTabs: (tabs: Tab[]) => void
  updateTab: (id: string, tab: Partial<Tab>) => void
  setActiveTab: (id: string) => void
  sync: () => void
}
