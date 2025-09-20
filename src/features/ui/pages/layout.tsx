import { lazy, Suspense, useEffect, useLayoutEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useNavigate } from "react-router";
import { Tab } from "~/features/browsers/classes/tab";
import { useTabStore } from "../stores/useTabStore";
import { useMinusThemeStore } from "../stores/useMinusTheme";

const SideMenu = lazy(() => import("../components").then((module) => ({ default: module.SideMenu })));
const Spotlight = lazy(() => import("../components").then((module) => ({ default: module.Spotlight })));
const UPDATE_TIMEOUT = 15 * 1000;

const LAYOUT_CLASS = {
  BASIC: "flex h-screen overflow-hidden bg-slate-800",
  FLOATING: "flex h-screen overflow-hidden bg-slate-800 p-1 gap-1",
};

const Layout = () => {
  const layout = useMinusThemeStore().layout;
  useEffect(() => {
    window.api.LISTENER("GET_TABS", (v) => {
      console.log("LAYOUT: getScreenData v", v);
    });
  }, []);
  return (
    <LayoutSideEffect>
      <div className={LAYOUT_CLASS[layout]}>
        <Suspense fallback={"Loading..."}>
          <SideMenu />
        </Suspense>
        <div className="h-full overflow-auto w-full">
          <ErrorBoundary fallback={<p>⚠️Something went wrong</p>}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
      <Suspense fallback={"Loading..."}>
        <SpotlightProvider />
      </Suspense>
      <SyncSideEffect />
    </LayoutSideEffect>
  );
};

const LayoutSideEffect = ({ children }: { children: React.ReactNode }) => {
  const { addNewTab } = useTabStore();
  const minus = useMinusThemeStore();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        // const data = await window.api.INVOKE<{ tabs: Tab[]; index: number }>("GET_TABS");
        const userI = await window.api.INVOKE("GET_USER_INTERFACE");
        minus.initialize(userI);
      } catch (error) {
        console.error("Error getting tabs:", error);
      }
    };
    getScreenData();
  }, []);
  useEffect(() => {
    window.api.LISTENER("CREATE_TAB", (tab?: Partial<Tab>) => {
      const newTab = addNewTab(tab);
      if (newTab.id) {
        navigate(newTab.id);
      }
    });
  }, []);
  return children;
};

const SyncSideEffect = () => {
  const { sync } = useTabStore();
  const dataSync = useMinusThemeStore().dataSync;
  const intervalTime =
    dataSync.intervalTime === "off"
      ? false
      : isNaN(Number(dataSync.intervalTime))
        ? 15
        : Number(dataSync.intervalTime) * 1000;
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (intervalTime) {
      interval = setInterval(() => {
        sync();
      }, intervalTime);
    }

    return () => intervalTime && interval && clearInterval(interval);
  }, [intervalTime]);
  return "";
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

export default Layout;
