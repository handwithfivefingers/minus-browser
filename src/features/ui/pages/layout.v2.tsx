import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { Outlet } from "react-router";
import { ThemeProvider } from "../context/theme";
import { useTabStore } from "../stores/useTabStore";
import { Tab } from "~/features/browsers/classes/tab";
import { useKeyboardBinding } from "../hooks/useKeyboardBinding";
const SideMenuV2 = lazy(() => import("../components").then((module) => ({ default: module.SideMenuV2 })));
const Spotlight = lazy(() => import("../components").then((module) => ({ default: module.Spotlight })));
const UPDATE_TIMEOUT = 15 * 1000;
const LayoutV2 = () => {
  useKeyboardBinding();
  const { initialize, tabs, index } = useTabStore();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        const data = await window.api.INVOKE<{ tabs: Tab[]; index: number }>("GET_TABS");
        initialize(data);
      } catch (error) {
        console.error("Error getting tabs:", error);
      }
    };
    getScreenData();
  }, []);
  useEffect(() => {
    let interval = setInterval(() => {
      window.api.INVOKE("CLOUD_SAVE", { data: tabs?.filter((item) => !!item), index });
    }, UPDATE_TIMEOUT);
    return () => clearInterval(interval);
  }, [tabs]);
  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 w-full">
      <ThemeProvider>
        <Suspense fallback={"Loading..."}>
          <SideMenuV2 />
        </Suspense>
        <Outlet />
        <Suspense fallback={"Loading..."}>
          <SpotlightProvider />
        </Suspense>
      </ThemeProvider>
    </div>
  );
};

const SpotlightProvider = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    window.api.LISTENER("SEARCH", (data) => {
      setShow(data.open);
    });
  }, []);
  return show ? <Spotlight /> : null;
};

export default LayoutV2;
