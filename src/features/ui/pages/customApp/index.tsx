import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { ITab } from "~/features/browsers";
import { useContentView } from "../../hooks/useContentView";
import { debounce } from "../../libs";
import { useMinusThemeStore } from "../../stores/useMinusTheme";

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
  const [tab, setTab] = useState<ITab>({} as ITab);
  const [isLoading, setIsLoading] = useState(false);

  useLayoutEffect(() => {
    getScreenData();
  }, [tabId]);
  const handleSearch = async (url: string) => {
    try {
      const outputFormat = navigateOrSearch(url);
      window.api.EMIT("VIEW_CHANGE_URL", { id: tabId, url: outputFormat });
    } catch (error) {
      console.log("VIEW_CHANGE_URL error", error);
    }
  };

  /**
   * Processes input from a custom address bar (Omnibox).
   * Handles: Protocols, Localhost, IPs, Domains, and Search Queries.
   */
  function navigateOrSearch(
    input: string,
    searchEngineUrl = "https://google.com/search?q=",
  ) {
    const query = input.trim();
    if (!query) return;

    // 1. Check for explicit protocols (http, https, ftp, file)
    if (/^(https?|ftp|file):\/\//i.test(query)) {
      return query;
    }

    // 2. Check for Localhost or IP Addresses (e.g., localhost:3000 or 127.0.0.1)
    const localOrIpRegex =
      /^(localhost|(\d{1,3}\.){3}\d{1,3}|\[[a-fA-F0-9:]+\])(:\d+)?(\/.*)?$/i;
    if (localOrIpRegex.test(query)) {
      return `http://${query}`; // Assume http for local
    }

    // 3. Check for valid Domain patterns (e.g., example.com, site.org/path)
    // Rule: Must have a dot, NO spaces, and end with a likely TLD (2+ chars)
    const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}(\/.*)?$/i;
    if (!/\s/.test(query) && domainRegex.test(query)) {
      return `https://${query}`;
    }

    // 4. Default: Treat as a Search Query
    return searchEngineUrl + encodeURIComponent(query);
  }
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
    window.api.LISTENER("ON_RELOAD", onReload);
    window.api.LISTENER(`did-start-load:${tabId}`, onDidStartLoad);
    window.api.LISTENER(`did-stop-loading:${tabId}`, onDidFinishLoad);
  }, [tabId]);

  const getScreenData = async () => {
    const tab = await window.api.INVOKE<ITab>("GET_TAB", { id: tabId });
    setTab(tab);
  };
  console.log("CustomApp tab >>>>", tab);
  if (!tab.id) return;
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

  const getContentView = async (tab: Partial<ITab>) => {
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
