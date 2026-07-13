import { useEffect, useLayoutEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Outlet, useNavigate } from "react-router";
import { IUserInterface } from "~/shared/types";
import { IPC_INVOKE_CHANNEL, IPC_RENDERER_EVENT } from "~/shared/constants/ipc";
import { AiSidebar, SideMenu, NotificationContainer, UpdateBanner } from "../components";

import { useAiSidebarStore } from "../features/aiSider/stores/useAiSidebarStore";
import { tabServices } from "../services/tab.service";
import { useMinusThemeStore } from "../stores/useMinusTheme";
import { useTabStore } from "../stores/useTabStore";
import { setupUpdateListener } from "../stores/useUpdateStore";

const LAYOUT_CLASS = {
  BASIC: "flex h-screen overflow-hidden bg-slate-800",
  FLOATING: "flex h-screen overflow-hidden bg-slate-800 p-1 gap-1",
};
const Layout = () => {
  const layout = useMinusThemeStore().layout || "FLOATING";
  const { setTabs } = useTabStore();
  const navigate = useNavigate();

  useEffect(() => {
    let timeout = setInterval(async () => {
      const tabs = await tabServices.getTabs();
      if (tabs?.length) {
        setTabs?.(tabs);
        if (timeout) clearInterval(timeout);
      }
    }, 1000);

    window.api.LISTENER("GET_TABS", (v) => {
      if (timeout) clearInterval(timeout);
      setTabs(v);
    });

    return () => {
      if (timeout) clearInterval(timeout);
    };
  }, []);

  useEffect(() => {
    setupUpdateListener();
    window.api.LISTENER("OPEN_TAB_BY_ID", (payload?: { id?: string }) => {
      if (payload?.id) {
        navigate(`/${payload.id}`);
      }
    });
    window.api.LISTENER("NAVIGATE_HISTORY", () => {
      navigate("/history");
    });
  }, []);

  useEffect(() => {
    window.api.LISTENER("CAPTURE_PAGE", () => {
      window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_PAGE);
    });
    window.api.LISTENER(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION, () => {
      window.api.INVOKE(IPC_INVOKE_CHANNEL.CAPTURE_SELECTION);
    });
    window.api.LISTENER(IPC_RENDERER_EVENT.AI_SELECTION_AVAILABLE, (payload?: { text?: string; action?: string }) => {
      const text = payload?.text?.trim();
      if (!text) return;
      const action = payload?.action || "explain";
      const modeMap: Record<string, "chat" | "summarize" | "explain"> = {
        chat: "chat",
        summarize: "summarize",
        explain: "explain",
      };
      useAiSidebarStore.getState().setPendingText(text);
      useAiSidebarStore.getState().setMode(modeMap[action] || "explain");
      useAiSidebarStore.getState().open();
    });
  }, []);

  return (
    <LayoutSideEffect>
      <div className="flex flex-col h-screen">
        <NotificationContainer />
        <UpdateBanner />
        <div className={LAYOUT_CLASS[layout as keyof typeof LAYOUT_CLASS]}>
          <SideMenu />
          <div className="h-full overflow-auto w-full">
            <ErrorBoundary fallback={<p>⚠️Something went wrong</p>}>
              <Outlet />
            </ErrorBoundary>
          </div>
          <AiSidebar />
        </div>
      </div>
    </LayoutSideEffect>
  );
};

const LayoutSideEffect = ({ children }: { children: React.ReactElement | React.ReactNode }): React.ReactElement => {
  const minus = useMinusThemeStore();
  useLayoutEffect(() => {
    const getScreenData = async () => {
      try {
        const theme: IUserInterface = await window.api.INVOKE("GET_USER_INTERFACE");
        if (theme) minus.initialize(theme);
      } catch (error) {
        console.error("Error getting tabs:", error);
      }
    };
    getScreenData();
  }, []);

  return children as React.ReactElement;
};

export default Layout;
