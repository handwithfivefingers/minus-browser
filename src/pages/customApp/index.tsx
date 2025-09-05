import { IconInnerShadowTopLeft } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import Header from "~/components/header";
import { ITab } from "~/features/browsers";
import { useContentView } from "~/hooks/useContentView";
import { useTab } from "~/hooks/useTab";

const isValidDomain = (url: string) => {
  const regex = new RegExp(/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/, "g");
  const isValid = regex.test(url);
  return isValid;
};
const CustomApp = () => {
  const webviewRef = useRef<HTMLDivElement | null>(null);
  const { customApp: tabId } = useParams();
  const { SHOW_VIEW_BY_ID, VIEW_CHANGE_URL } = useContentView();
  const { GET_TAB } = useTab();
  const [tab, setTab] = useState<ITab | null>(null);

  useEffect(() => {
    if (!tabId) return;
    getContentView();

    const autoSize = () => {
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      window.api.VIEW_RESPONSIVE({ id: tabId, screen: { x, y, width, height } });
    };
    const resizeObserver = new ResizeObserver(() => {
      autoSize();
    });

    resizeObserver?.observe(webviewRef.current);

    return () => {
      window.api.VIEW_HIDE({ id: tabId });
      if (!resizeObserver) return;
      if (webviewRef.current) resizeObserver?.unobserve(webviewRef.current);
    };
  }, [tabId]);

  useEffect(() => {
    window.api.VIEW_URL_CHANGED((value) => {
      setTab({ ...tab, url: value.url });
    });
  }, []);

  const getContentView = async () => {
    try {
      const { x, y, width, height } = webviewRef.current.getBoundingClientRect();
      const screen = { x, y, width, height };
      const resp = await GET_TAB(tabId);
      await SHOW_VIEW_BY_ID({ id: tabId, screen });
      console.log("resp", resp);
      setTab(resp);
    } catch (error) {
      console.log("error", error);
    }
  };
  const handleSearch = async (url: string) => {
    try {
      const isValid = isValidDomain(url);
      if (!isValid) {
        return VIEW_CHANGE_URL({ id: tabId, url: "https://www.google.com/search?q=" + url });
      } else VIEW_CHANGE_URL({ id: tabId, url: `https://${url}` });
    } catch (error) {
      console.log("VIEW_CHANGE_URL error", error);
    }
  };

  const onBackWard = async () => {
    try {
      return window.api.ON_BACKWARD();
    } catch (error) {
      console.log("onBackWard error", error);
    }
  };
  const onForward = async () => {
    try {
      return window.api.ON_FORWARD();
    } catch (error) {
      console.log("onForward error", error);
    }
  };

  const onToggleDevTools = async () => {
    try {
      window.api.TOGGLE_DEV_TOOLS(tabId);
    } catch (error) {
      console.log("onToggleDevTools error", error);
    }
  };
  const onReload = async () => {
    try {
      window.api.ON_RELOAD(tabId);
    } catch (error) {
      console.log("onToggleDevTools error", error);
    }
  };
  return (
    <div className="h-screen rounded-md relative overflow-hidden">
      <Header
        url={tab?.url}
        onSearch={handleSearch}
        onBackWard={onBackWard}
        onForward={onForward}
        onToggleDevTools={onToggleDevTools}
        onReload={onReload}
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
