import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { useEffect, useRef } from "react";
import { useParams } from "react-router";
import { ITab } from "~/features/browsers";
import Header from "~/features/ui/components/header";
import { useContentView } from "../../hooks/useContentView";
import { useTabStore } from "../../stores/useTabStore";
import { isValidDomain } from "../../libs";

const CustomApp = () => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { customApp: tabId } = useParams();
  const tabStore = useTabStore();
  const { getTabById, setActiveTab, updateTab, tabs } = tabStore;
  const { showViewByID } = useContentView();
  const tab = getTabById(tabId ? tabId : "");
  useEffect(() => {
    window.tabStore = tabStore;
  }, []);
  // const { GET_TAB } = useTab();
  // const [tab, setTab] = useState<ITab | null>(null);

  // useEffect(() => {
  //   if (!tabId) return;
  //   getContentView();

  //   const autoSize = () => {
  //     const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
  //     // window.api.VIEW_RESPONSIVE({ id: tabId, screen: { x, y, width, height } });
  //     window.api.INVOKE("VIEW_RESPONSIVE", { id: tabId, screen: { x, y, width, height } });
  //   };
  //   const resizeObserver = new ResizeObserver(() => {
  //     autoSize();
  //   });

  //   resizeObserver?.observe(webviewRef.current);

  //   return () => {
  //     window.api.INVOKE("VIEW_HIDE", { id: tabId });
  //     if (!resizeObserver) return;
  //     if (webviewRef.current) resizeObserver?.unobserve(webviewRef.current);
  //   };
  // }, [tabId]);

  // useEffect(() => {
  //   window.api.LISTENERS("VIEW_URL_CHANGED", (value: { id: string; url: string }) => {
  //     if (value.id === tabId) {
  //       setTab({ ...tab, url: value.url });
  //     }
  //   });
  // }, []);

  const getContentView = async (tab: ITab) => {
    try {
      if (!webviewRef.current) return;
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      const screen = { x, y, width, height };
      const data = { screen, tab: { ...tab } };
      await showViewByID(data);
    } catch (error) {
      console.log("error", error);
    }
  };
  const handleSearch = async (url: string) => {
    try {
      console.log("handleSearch", url);
      const isValid = isValidDomain(url);
      if (!isValid) {
        return window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: "https://www.google.com/search?q=" + url });
      } else {
        return window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: `https://${url}` });
      }
    } catch (error) {
      console.log("VIEW_CHANGE_URL error", error);
    }
  };

  const onBackWard = async () => {
    // try {
    //   return window.api.ON_BACKWARD();
    // } catch (error) {
    //   console.log("onBackWard error", error);
    // }
  };

  const onToggleDevTools = async () => {
    try {
      window.api.EMIT("TOGGLE_DEV_TOOLS", { id: tabId });
    } catch (error) {
      console.log("onToggleDevTools error", error);
    }
  };
  const onReload = async () => {
    try {
      window.api.EMIT("ON_RELOAD", tab);
    } catch (error) {
      console.log("onToggleDevTools error", error);
    }
  };
  const onCloseTab = async () => {
    // try {
    //   return window.api.ON_CLOSE_TAB(tabId);
    // } catch (error) {
    //   console.log("onCloseTab error", error);
    // }
  };

  // useLayoutEffect(() => {
  //   if (!webviewRef.current) return;
  //   if (!tab) return;
  //   const autoSize = () => {
  //     if (!webviewRef.current) return;
  //     const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
  //     window.api.EMIT("VIEW_RESPONSIVE", { tab, screen: { x, y, width, height } });
  //   };
  //   const resizeObserver = new ResizeObserver(() => autoSize());
  //   resizeObserver?.observe(webviewRef.current);
  //   return () => webviewRef.current && resizeObserver?.unobserve(webviewRef.current as Element);
  // }, []);

  useEffect(() => {
    if (!webviewRef.current) return;
    if (!tab) return;
    setActiveTab(tab.id);
    getContentView(tab);

    const autoSize = () => {
      if (!webviewRef.current) return;
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      window.api.EMIT("VIEW_RESPONSIVE", { tab, screen: { x, y, width, height } });
    };
    const resizeObserver = new ResizeObserver(() => autoSize());
    resizeObserver?.observe(webviewRef.current);

    window.api.LISTENER(`page-title-updated:${tab.id}`, (value: { id: string; title: string; url: string }) => {
      updateTab(tab.id, { title: value.title, url: value.url });
    });
    window.api.LISTENER(`page-favicon-updated:${tab.id}`, (value: { favicon: string }) => {
      updateTab(tab.id, { favicon: value.favicon });
    });
    return () => {
      tab.id && window.api.EMIT("HIDE_VIEW", { id: tab.id });
      webviewRef.current && resizeObserver?.unobserve(webviewRef.current as Element);
    };
  }, [tab]);

  return (
    <div className="h-screen rounded-md relative overflow-hidden">
      <Header
        id={tab?.id}
        url={tab?.url}
        onSearch={handleSearch}
        onBackWard={onBackWard}
        onToggleDevTools={onToggleDevTools}
        onReload={onReload}
        onCloseTab={onCloseTab}
      />
      <div className="h-[calc(100vh-48px)] rounded-md relative overflow-hidden">
        <div
          className="mx-auto absolute z-0 left-0 top-0 w-full h-full flex justify-center items-center"
          ref={webviewRef}
        >
          <IconInnerShadowTopLeft className="animate-spin" />
        </div>
      </div>
    </div>
  );
};

export default CustomApp;
