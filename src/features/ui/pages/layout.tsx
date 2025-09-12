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
    </LayoutSideEffect>
  );
};

const LayoutSideEffect = ({ children }: { children: React.ReactNode }) => {
  const { initialize, tabs, index, addNewTab } = useTabStore();
  const minus = useMinusThemeStore();
  const navigate = useNavigate();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        const data = await window.api.INVOKE<{ tabs: Tab[]; index: number }>("GET_TABS");
        const userI = await window.api.INVOKE("GET_USER_INTERFACE");
        console.log("userI", userI);
        initialize(data);
        minus.initialize(userI);
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

  useEffect(() => {
    window.api.LISTENER("CREATE_TAB", (tab?: Partial<Tab>) => {
      const newTab = addNewTab(tab);
      if (newTab.id) {
        navigate(newTab.id);
      }
    });
  }, []);
console.log('load')
  return children;
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
