import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ITab } from "~/features/browsers";
import Header from "~/features/ui/components/header";
import { useContentView } from "../../hooks/useContentView";
import { isValidDomain } from "../../libs";
import { useTabStore } from "../../stores/useTabStore";

const CustomApp = () => {
  const { customApp: tabId } = useParams();
  const tabStore = useTabStore();
  const { tabsIndex, tabs } = tabStore;
  const tab = tabs[tabsIndex[tabId]];
  const navigate = useNavigate();
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
    try {
      return window.api.EMIT("ON_BACKWARD");
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
  const onCloseTab = async () => {
    window.api.EMIT("ON_CLOSE_TAB", tab);
    const resp = tabStore.closeTab(tab);
    console.log("resp", resp);
    navigate(`/`);
  };
  const onRequestPIP = async () => {
    window.api.EMIT("REQUEST_PIP", { tab });
  };

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
        onRequestPIP={onRequestPIP}
      />
      <WebViewInstance id={tabId} />
    </div>
  );
};

const WebViewInstance = ({ id }: { id: string }) => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { tabsIndex, setActiveTab, updateTab, tabs } = useTabStore();
  const { showViewByID } = useContentView();
  const tab = useMemo(() => tabs[tabsIndex[id]], [id]);
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
  return (
    <div className="h-[calc(100vh-48px)] rounded-md relative overflow-hidden">
      <div
        className="mx-auto absolute z-0 left-0 top-0 w-full h-full flex justify-center items-center"
        ref={webviewRef}
      >
        <IconInnerShadowTopLeft className="animate-spin" />
      </div>
    </div>
  );
};

export default CustomApp;
