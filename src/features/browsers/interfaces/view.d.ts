import { WebContentsView, BrowserView, Electron } from "electron";
import { WebContentsViewController } from "../controller/webContentsViewController";

export interface IView extends WebContentsView {
  url?: string;
  viewType?: "WebContentsView" | "Page";
}

export interface IShowViewProps {
  id: string;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

export type IPC<T = any> = {
  channel: string;
  data?: T;
};

export interface IHandleResizeView {
  tab: ITab;
  screen: IShowViewProps | Electron.Rectangle;
}
