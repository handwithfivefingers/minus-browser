import { useEffect, useLayoutEffect, useState } from "react";
import { Outlet } from "react-router";
import { SideMenu, Spotlight } from "../components";
import { ThemeProvider } from "../context/theme";
import { Tab } from "~/features/browsers/controller/tabManager";
import { useTabStore } from "../stores/useTabStore";

const Layout = () => {
  const tabStores = useTabStore();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        const data = await window.api.INVOKE<Tab[]>("GET_TABS");
        console.log("data", data);
        tabStores.initialize(data);
      } catch (error) {
        console.error("Error getting tabs:", error);
      }
    };
    getScreenData();
    window.tabStores = tabStores;
  }, []);
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
    </ThemeProvider>
  );
};

const SpotlightProvider = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const toggleSpotlight = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.ctrlKey || e.metaKey)) {
        setShow((p) => !p);
      }
    };
    document.addEventListener("keydown", toggleSpotlight);
    return () => document.removeEventListener("keydown", toggleSpotlight);
  }, []);
  return show ? <Spotlight /> : null;
};

export default Layout;
