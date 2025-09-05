declare global {
  interface Window {
    api: {
      GET_TABS: () => Promise<ITab[]>;
      GET_TAB: (id: string) => Promise<ITab>;
      CREATE_TAB: (tab: Partial<ITab>) => Promise<unknown>;
      updateTab: (id: string, tab: Partial<ITab>) => Promise<unknown>;
      deleteTab: (id: string) => Promise<unknown>;
      selectTab: (id: string) => Promise<unknown>;
      focusTab: (id: string) => Promise<unknown>;
      blurTab: (id: string) => Promise<unknown>;

      SHOW_VIEW_BY_ID: (params: IShowViewProps) => Promise<unknown>;
      VIEW_CHANGE_URL: (params: IViewChangeProps) => Promise<unknown>;
      VIEW_TITLE_CHANGED: (cb: (value: { id: string; title: string }) => void) => void;
      VIEW_URL_CHANGED: (cb: (value: { id: string; url: string }) => void) => void;
      VIEW_FAVICON_CHANGED: (cb: (value: { id: string; favicon: string }) => void) => void;
      ON_TABS_UPDATED: (cb: (value: { id: string }) => void) => void;
      VIEW_RESPONSIVE: (data: IShowViewProps) => void;
      VIEW_HIDE: ({ id: string }) => void;

      ON_BACKWARD: () => void;
      ON_FORWARD: () => void;

      TOGGLE_DEV_TOOLS: (tabId: string) => void;
      ON_RELOAD: (tabId: string) => void;
      ON_CLOSE_TAB: (tabId: string) => void;
    };
  }
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
export interface IViewChangeProps {
  id: string;
  url: string;
}
