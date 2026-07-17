import { Tab } from "../interfaces";

export const useUserScript = (tab?: Tab) => {
  const onOpenUserscriptManager = async () => {
    try {
      await window.api.INVOKE("USERSCRIPT_OPEN_MANAGER", { tabId: tab?.id });
    } catch (error) {
      console.error("onOpenUserscriptManager error", error);
    }
  };

  return {
    onOpenUserscriptManager,
  };
};
