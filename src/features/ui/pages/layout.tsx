import { lazy, useEffect, useLayoutEffect, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet } from "react-router";
import { IUserInterface } from "~/shared/types";
import { SideMenu } from "../components";
import { tabServices } from "../services/tab.service";
import { useMinusThemeStore } from "../stores/useMinusTheme";
import { useTabStore } from "../stores/useTabStore";
import { error } from "node:console";

const Spotlight = lazy(() => import("../components").then((module) => ({ default: module.Spotlight })));
const LAYOUT_CLASS = {
  BASIC: "flex h-screen overflow-hidden bg-slate-800",
  FLOATING: "flex h-screen overflow-hidden bg-slate-800 p-1 gap-1",
};
const Layout = () => {
  const layout = useMinusThemeStore().layout;
  const { setTabs } = useTabStore();
  useEffect(() => {
    let timeout = setInterval(async () => {
      const tabs = await tabServices.getTabs();
      if (tabs?.length) {
        setTabs?.(tabs);
        if (timeout) clearInterval(timeout);
      }
    }, 1000);

    window.api.LISTENER("GET_TABS", (v) => {
      console.log("GET TABS", v);
      if (timeout) clearInterval(timeout);
      setTabs(v);
    });

    return () => {
      if (timeout) clearInterval(timeout);
    };
  }, []);
  return (
    <LayoutSideEffect>
      <div className={LAYOUT_CLASS[layout as keyof typeof LAYOUT_CLASS]}>
        <SideMenu />
        <div className="h-full overflow-auto w-full">
          <ErrorBoundary fallback={<p>⚠️Something went wrong</p>}>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
      {/*SPOTLIGHT is not ready for now*/}
      {/*<Suspense fallback={"Loading..."}>
        <SpotlightProvider />
      </Suspense>*/}
      <SyncSideEffect />
    </LayoutSideEffect>
  );
};

const LayoutSideEffect = ({ children }: { children: React.ReactElement | React.ReactNode }): React.ReactElement => {
  const minus = useMinusThemeStore();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        // const data = await window.api.INVOKE<{ tabs: Tab[]; index: number }>("GET_TABS");
        const theme: IUserInterface = await window.api.INVOKE("GET_USER_INTERFACE");
        minus.initialize(theme);
      } catch (error) {
        console.error("Error getting tabs:", error);
      }
    };
    getScreenData();
  }, []);

  return children as React.ReactElement;
};

const SyncSideEffect = (): React.ReactElement => {
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
    return () => {
      if (intervalTime && interval) {
        clearInterval(interval);
      }
    };
  }, [intervalTime]);

  return <></>;
};

const SpotlightProvider = () => {
  const [show, setShow] = useState(false);
  // useEffect(() => {
  //   window.api.LISTENER("SEARCH", (data) => {
  //     setShow(data.open);
  //   });
  // }, []);
  return show ? <Spotlight /> : undefined;
};

export default Layout;
