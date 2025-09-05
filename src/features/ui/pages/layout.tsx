import { useEffect, useState } from "react";
import { Outlet } from "react-router";
import { SideMenu } from "~/features/ui/components/sidebar";
import Spotlight from "~/features/ui/components/spotlight";
import { ThemeProvider } from "~/context/theme";

const Layout = () => {
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

      {show && <Spotlight />}
    </ThemeProvider>
  );
};

export default Layout;
