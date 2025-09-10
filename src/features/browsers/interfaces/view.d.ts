import { WebContentsView, BrowserView, Electron } from "electron";

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
export interface IViewController {
  window: BrowserWindow;
  viewManager: Record<string, WebContentsView>;
  viewActive: string;
  getTabs: () => Promise<{ tabs: ITab[]; index: number }>;
  handleShowViewById: (props: IHandleResizeView) => Promise<void>;

  createContentView: (id: string) => Promise<{ view: WebContentsView; contentView: Electron.WebContents }>;
  loadContentView: (id: string) => void;

  handleResizeView: (props: IHandleResizeView) => void;
  handleHideView: (props: { id: string }) => void;
  onGoBack: (props: { data: ITab }) => void;
  onCloseTab: (props: { id: string }) => void;
  handleToggleDevTools: (props: { id: string }) => void;
  handleReloadTab: (props: { data: ITab }) => Promise<void>;
  cloudSave: (props: { data: ITab[]; index: number }) => Promise<void>;
  destroy: () => void;
  init: () => void;
}
