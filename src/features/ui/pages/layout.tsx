import { useEffect, useLayoutEffect, useState } from "react";
import { Outlet } from "react-router";
import { SideMenu, Spotlight } from "../components";
import { ThemeProvider } from "../context/theme";
import { useTabStore } from "../stores/useTabStore";
import { Tab } from "~/features/browsers/classes/tab";
import { useKeyboardBinding } from "../hooks/useKeyboardBinding";

const UPDATE_TIMEOUT = 15 * 1000;
const Layout = () => {
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
    <ThemeProvider>
      <div className="flex h-screen overflow-hidden">
        <SideMenu />
        <div className="flex flex-col flex-1 bg-slate-100">
          <div className="h-full overflow-auto">
            <Outlet />
          </div>
        </div>
      </div>
      <SpotlightProvider />
    </ThemeProvider>
  );
};

const SpotlightProvider = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    window.api.LISTENER("SEARCH", (data) => {
      console.log("SpotlightProvider SEARCH data", data);
      setShow(data.open);
    });
  }, []);

  // useEffect(() => {
  //   const toggleSpotlight = (e: KeyboardEvent) => {
  //     if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
  //       setShow((p) => !p);
  //     }
  //   };
  //   document.addEventListener("keydown", toggleSpotlight);
  //   return () => document.removeEventListener("keydown", toggleSpotlight);
  // }, []);
  return show ? <Spotlight /> : null;
};

export default Layout;
