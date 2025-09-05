import { useMemo } from "react";
import { ITab } from "~/features/browsers";
import { IViewChangeProps } from "~/preload.d";
interface IShowViewProps {
  id: string;
  screen: {
    width: number;
    height: number;
    x: number;
    y: number;
  };
}
export const useContentView = () => {
  const apis = useMemo(() => {
    return {
      SHOW_VIEW_BY_ID: async ({ id, screen }: IShowViewProps) => {
        try {
          const response = await window.api.SHOW_VIEW_BY_ID({ id, screen });
          return response;
        } catch (error) {
          console.error("Error getting tabs:", error);
        }
      },

      VIEW_CHANGE_URL: async ({ id, url }: IViewChangeProps) => {
        try {
          const response = await window.api.VIEW_CHANGE_URL({ id, url });
          return response;
        } catch (error) {
          console.error("Error getting tabs:", error);
        }
      },
    };
  }, []);

  return apis;
};
