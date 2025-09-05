import { useMemo } from "react";
import { ITab } from "~/features/browsers";

export const useTab = () => {
  const apis = useMemo(() => {
    return {
      GET_TABS: async () => {
        try {
          const response = await window.api.GET_TABS();
          return response;
        } catch (error) {
          console.error("Error getting tabs:", error);
        }
      },
      GET_TAB: async (id: string) => {
        try {
          const response = await window.api.GET_TAB(id);
          return response;
        } catch (error) {
          console.error("Error getting tabs:", error);
        }
      },
      CREATE_TAB: async (tab?: Partial<ITab>) => {
        try {
          const response = await window.api.CREATE_TAB(tab);
          console.log("create tab ", response);
          return response;
        } catch (error) {
          console.error("Error creating tab:", error);
        }
      },
    };
  }, []);

  return apis;
};
