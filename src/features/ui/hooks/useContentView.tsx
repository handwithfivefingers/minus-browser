import { useMemo } from "react";
import { ITab } from "../../browsers/interfaces";

const EVENT_TYPE = {
  SHOW_VIEW_BY_ID: "SHOW_VIEW_BY_ID",
  VIEW_CHANGE_URL: "VIEW_CHANGE_URL",
};

interface IShowViewProps {
  tab: ITab;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}

interface IViewChange {
  id: string;
  url?: string;
  title?: string;
  favicon?: string;
}

interface IUseContentView {
  showViewByID: (params: IShowViewProps) => Promise<void>;
}

export const useContentView = () => {
  const apis = useMemo(() => {
    return {
      showViewByID: async (params: IShowViewProps) => {
        try {
          console.log("params", params);
          const response = await window.api.EMIT(EVENT_TYPE.SHOW_VIEW_BY_ID, params);
          return response;
        } catch (error) {
          console.error("Error getting tabs:", error);
        }
      },
      // onViewChange: async ({ id, url }: IViewChange) => {
      //   try {
      //     const response = await window.api.LISTENERS("TAB_UPDATED_URL", { id, url });
      //     const resp = await window.api.
      //     return response;
      //   } catch (error) {
      //     console.error("Error getting tabs:", error);
      //   }
      // },
    };
  }, []);

  return apis as IUseContentView;
};
