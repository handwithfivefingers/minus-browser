import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import { ITab } from "~/features/browsers";
import { useContentView } from "../../hooks/useContentView";
import { isValidDomainOrIP } from "../../libs";
import { useTabStore } from "../../stores/useTabStore";
import { useMinusThemeStore } from "../../stores/useMinusTheme";

const Header = lazy(() => import("~/features/ui/components/header"));
const LAYOUT_HEADER_CLASS = {
  BASIC: "h-screen relative overflow-hidden w-full flex flex-col",
  FLOATING: "h-[calc(100svh-8px)] rounded-md relative overflow-hidden w-full flex flex-col gap-1",
};

const PreHeader = ({ tabId }: { tabId: string }) => {
  const tabStore = useTabStore();
  const { tabsIndex, tabs } = tabStore;
  const tab = tabs[tabsIndex[tabId as string]];
  const [isLoading, setIsLoading] = useState(false);
  const handleSearch = async (url: string) => {
    try {
      console.log("handleSearch", url);
      const isValid = isValidDomainOrIP(url);
      console.log("isValid", isValid);
      if (!isValid) {
        return window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: "https://www.google.com/search?q=" + url });
      } else {
        if (url.startsWith("http://") || url.startsWith("https://")) {
          return window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: `${url}` });
        }
        return window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: `https://${url}` });
      }
    } catch (error) {
      console.log("VIEW_CHANGE_URL error", error);
    }
  };

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

  useEffect(() => {
    if (!tabId) return;
    const onDidStartLoad = () => {
      setIsLoading(true);
    };
    const onDidFinishLoad = () => {
      setIsLoading(false);
    };
    window.api.LISTENER(`did-start-load:${tabId}`, onDidStartLoad);
    window.api.LISTENER(`did-stop-loading:${tabId}`, onDidFinishLoad);
  }, [tabId]);

  return (
    <Suspense fallback={<div className="h-9">Loading header ...</div>}>
      <Header
        key={tabId}
        title={tab?.title}
        url={tab?.url}
        onSearch={handleSearch}
        onBackWard={onBackWard}
        onToggleDevTools={onToggleDevTools}
        onReload={onReload}
        onRequestPIP={onRequestPIP}
        isLoading={isLoading}
      />
    </Suspense>
  );
};
const CustomApp = () => {
  const { customApp: tabId } = useParams<{ customApp: string }>();
  const { layout } = useMinusThemeStore();

  return (
    <div className={LAYOUT_HEADER_CLASS[layout]}>
      <PreHeader tabId={tabId} />
      <WebViewInstance id={tabId} />
    </div>
  );
};

const WEBVIEW_CLASSES = {
  BASIC: "h-[calc(100vh-34px)] rounded-md relative overflow-hidden",
  FLOATING: "h-[calc(100vh-46px)] rounded-md relative overflow-hidden",
};

const WebViewInstance = ({ id }: { id: string }) => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { tabsIndex, setActiveTab, updateTab, tabs } = useTabStore();
  const { showViewByID } = useContentView();
  const tab = useMemo(() => tabs[tabsIndex[id]], [id]);

  const { layout } = useMinusThemeStore();

  useEffect(() => {
    if (!webviewRef.current) return;
    if (!tab) return;
    setActiveTab(tab.id);
    getContentView(tab);
    const autoSize = () => {
      if (!webviewRef.current) return;
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      window.api.EMIT("VIEW_RESPONSIVE", {
        tab,
        screen: { x, y, width, height },
      });
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
      tab.id && window.api.EMIT("HIDE_VIEW", tab);
      webviewRef.current && resizeObserver?.unobserve(webviewRef.current as Element);
    };
  }, [tab]);

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
