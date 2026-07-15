export interface WebNotification {
  id: string;
  tabId: string;
  tabTitle: string;
  favicon: string;
  title: string;
  body?: string;
  timestamp: number;
  read: boolean;
}
