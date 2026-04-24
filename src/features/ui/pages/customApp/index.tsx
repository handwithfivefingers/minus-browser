import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useParams } from "react-router";
import { useContentView } from "../../hooks/useContentView";
import { Tab } from "../../interfaces";
import { debounce, navigateOrSearch } from "../../libs";
import { tabServices } from "../../services/tab.service";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { useTabStore } from "../../stores/useTabStore";

const Header = lazy(() => import("~/features/ui/components/header"));
const LAYOUT_HEADER_CLASS = {
  BASIC: "h-screen relative overflow-hidden w-full flex flex-col",
  FLOATING:
    "h-[calc(100svh-8px)] rounded-md relative overflow-hidden w-full flex flex-col gap-1",
};
const WEBVIEW_CLASSES = {
  BASIC: "h-[calc(100vh-34px)] rounded-md relative overflow-hidden",
  FLOATING: "h-[calc(100vh-46px)] rounded-md relative overflow-hidden",
};

const CustomApp = () => {
  const { customApp: tabId } = useParams<{ customApp: string }>();
  const { layout } = useMinusThemeStore();
  const [isLoading, setIsLoading] = useState(false);
  const tab = useTabStore((s) => s.activeTab);
  const updateTab = useTabStore((s) => s.updateTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  useEffect(() => {
    setActiveTab(tabId);
    getScreenData();
    tabServices.subscribeTab(tabId, ({ favicon, title, url }) => {
      updateTab(tabId, { favicon, title, url });
    });
    window.api.LISTENER("ON_RELOAD", onReload);
    window.api.LISTENER(`LOADING:${tabId}`, onTabNavigate);
    window.api.LISTENER(`TITLE_UPDATED:${tabId}`, (str: string) => {
      updateTab(tabId, { title: str });
    });
  }, [tabId]);

  const onTabNavigate = (isLoading: boolean) => {
    setIsLoading(isLoading);
  };

  const handleSearch = async (url: string) => {
    try {
      const outputFormat = navigateOrSearch(url);
      updateTab(tabId, { url: outputFormat });
      window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: outputFormat });
    } catch (error) {
      console.log("VIEW_CHANGE_URL error", error);
    }
  };

  /**
   * Processes input from a custom address bar (Omnibox).
   * Handles: Protocols, Localhost, IPs, Domains, and Search Queries.
   */

  const onBackWard = async () => {
    try {
      return window.api.EMIT("ON_BACKWARD", { data: tab });
    } catch (error) {
      console.log("onBackWard error", error);
    }
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

  const onRequestPIP = async () => {
    window.api.EMIT("REQUEST_PIP", { tab });
  };

  const getScreenData = async () => {
    const tab = await window.api.INVOKE<Tab>("GET_TAB", { id: tabId });
    updateTab(tabId, tab);
  };
  if (!tabId) return <Navigate to={"/"} />;
  return (
    <div className={LAYOUT_HEADER_CLASS[layout]}>
      <Header
        key={tabId}
        id={tabId}
        title={tab?.title}
        url={tab?.url}
        isBookmarked={tab?.isBookmarked}
        onSearch={handleSearch}
        onBackWard={onBackWard}
        onToggleDevTools={onToggleDevTools}
        onReload={onReload}
        onRequestPIP={onRequestPIP}
        isLoading={isLoading}
      />
      <WebViewInstance id={tabId} />
    </div>
  );
};

const WebViewInstance = ({ id }: { id: string }) => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { showViewByID } = useContentView();
  const { layout } = useMinusThemeStore();

  useEffect(() => {
    if (!webviewRef.current) return;
    if (!id) return;
    getContentView({ id });
    const autoSize = debounce(() => {
      if (!webviewRef.current) return;
      const { x, y, width, height } =
        webviewRef.current.getBoundingClientRect();
      window.api.EMIT("VIEW_RESPONSIVE", {
        tab: { id },
        screen: { x, y, width, height },
      });
    }, 100);
    const resizeObserver = new ResizeObserver(autoSize);
    resizeObserver?.observe(webviewRef.current);
    // window.api.LISTENER(`page-favicon-updated:${id}`, (value: { title: string; favicon: string }) => {
    //   // updateTab(id, { ...value });
    // });
    return () => {
      id && window.api.EMIT("HIDE_VIEW", { id });
      webviewRef.current &&
        resizeObserver?.unobserve(webviewRef.current as Element);
    };
  }, [id]);

  const getContentView = async (tab: Partial<Tab>) => {
    try {
      if (!webviewRef.current) return;
      const { x, y, width, height } =
        webviewRef.current.getBoundingClientRect();
      const screen = { x, y, width, height };
      const data = { screen, tab: tab };
      await showViewByID(data);
    } catch (error) {
      console.log("error", error);
    }
  };
  useEffect(() => {
    window.api.LISTENER("TOGGLE_DEV_TOOLS", () => {
      window.api.EMIT("TOGGLE_DEV_TOOLS", { id });
    });
  }, []);

  return (
    <div className={WEBVIEW_CLASSES[layout]}>
      <div
        className="mx-auto absolute z-0 left-0 top-0 w-full h-full flex justify-center items-center mt-auto"
        ref={webviewRef}
      >
        <IconInnerShadowTopLeft className="animate-spin" />
      </div>
    </div>
  );
};

export default CustomApp;
