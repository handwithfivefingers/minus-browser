import {
  IconBrain,
  IconCamera,
  IconChevronLeft,
  IconCode,
  IconCodeDots,
  IconKey,
  IconLanguage,
  IconLock,
  IconPictureInPicture,
  IconReload,
  IconSearch,
  IconShieldCancel,
  IconSnowflake,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { useAiSidebarStore } from "../features/aiSider/stores/useAiSidebarStore";
import { useMinusThemeStore } from "../stores/useMinusTheme";
interface IHeader {
  url?: string;
  id: string;
  onSearch: (v: string) => void;
  onBackWard: () => void;
  onToggleDevTools: () => void;
  onReload: () => void;
  onRequestPIP: () => void;
  // onFillPassword: () => void;
  onOpenVaultManager: () => void;
  onOpenUserscriptManager: () => void;
  onTranslatePage: () => void;
  // onTranslateSelection: () => void;
  onOpenTranslateManager: () => void;
  onOpenSpotlight: (query?: string) => void;
  onCapturePage?: () => void;
  onCaptureSelection?: () => void;
  title?: string;
  isLoading: boolean;
  isBookmarked?: boolean;
  preventHibernate?: boolean;
  onTogglePreventHibernate?: () => void;
}

const LAYOUT_HEADER_CLASS = {
  BASIC: "flex gap-2 border-b border-slate-200 px-2 py-1 justify-between bg-slate-100 w-full",
  FLOATING: "flex gap-2 border-b border-slate-200 px-2 py-1 justify-between bg-slate-100 w-full rounded-lg",
};

const Header = ({
  title,
  id,
  isLoading,
  url,
  isBookmarked,
  preventHibernate,
  onBackWard,
  onToggleDevTools,
  onReload,
  onRequestPIP,
  // onFillPassword,
  onOpenVaultManager,
  onOpenUserscriptManager,
  onTranslatePage,
  // onTranslateSelection,
  onOpenTranslateManager,
  onOpenSpotlight,
  onCapturePage,
  onCaptureSelection,
  onTogglePreventHibernate,
}: IHeader) => {
  const { layout, extension } = useMinusThemeStore();
  const [stats, setStats] = useState<{ blockedRequests: number } | null>(null);

  useEffect(() => {
    (async () => {
      const s = await (window.api.INVOKE as any)("@adb/get-stats");
      setStats(s);
    })();
  }, []);

  const openSiteInfo = (e: React.MouseEvent) => {
    if (!url) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    window.api.INVOKE("OPEN_SITE_INFO", {
      url,
      anchor: { x: rect.left, y: rect.bottom, width: rect.width, height: rect.height },
    });
  };

  const openSpotlight = () => {
    onOpenSpotlight(url || "");
  };
  if (!id) return null;
  return (
    <div className={LAYOUT_HEADER_CLASS[layout as keyof typeof LAYOUT_HEADER_CLASS]}>
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1"
          onClick={onBackWard}
          title="Go back"
        >
          <IconChevronLeft size={16} />
        </button>
      </div>
      <div className="flex items-center">
        <button
          onClick={onTogglePreventHibernate}
          className={clsx(
            "rounded-full p-1.5 cursor-pointer transition-all",
            preventHibernate
              ? "bg-cyan-500 text-white shadow-sm shadow-cyan-400 hover:shadow-md hover:shadow-cyan-400"
              : "text-slate-400 hover:bg-slate-200 hover:text-slate-600",
          )}
          title={
            preventHibernate
              ? "Hibernation disabled — this tab will stay alive regardless of inactivity"
              : "Hibernation allowed — tab will auto-hibernate when idle"
          }
        >
          <IconSnowflake size={14} />
        </button>
        <button
          onClick={onReload}
          className={clsx(
            "hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-indigo-500 cursor-pointer active:translate-y-0.5 text-indigo-500 rounded-full",
            {
              "animate-spin": isLoading,
            },
          )}
        >
          <IconReload size={12} />
        </button>
      </div>
      <div
        className={"flex gap-1 w-1/2 bg-white rounded-full border-2 transition-all relative mx-auto border-transparent"}
      >
        <div className="flex gap-px items-center">
          <button
            className="hover:bg-indigo-500 h-[calc(100%-4px)] hover:text-white cursor-pointer p-1 active:translate-y-0.5 transition-all text-indigo-500 rounded-full"
            onClick={onTranslatePage}
            title="Translate page"
          >
            <IconLanguage size={12} />
          </button>
          <button
            type="button"
            onClick={openSiteInfo}
            className="p-1 rounded-full transition-colors cursor-pointer text-slate-400 hover:text-indigo-500 hover:bg-indigo-50"
            title="Site information"
          >
            <IconLock size={12} />
          </button>
        </div>
        <div className="flex items-center rounded-full gap-1 w-full overflow-hidden">
          <input
            className="py-1 w-full transition-all outline-transparent outline bg-white text-xs cursor-pointer"
            value={title || ""}
            onMouseDown={(event) => {
              event.preventDefault();
              openSpotlight();
            }}
            placeholder="Ctrl + K"
            title={title || url || ""}
            readOnly
          />
        </div>
        <button
          className="hover:text-white transition-all  px-1 py-1  h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-0.5 top-0.5 rounded-full"
          onClick={openSpotlight}
          title="Search"
        >
          <IconSearch size={12} />
        </button>
      </div>

      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded-full flex gap-2 items-center bg-slate-200">
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
          onClick={onRequestPIP}
          title="Picture in picture"
        >
          <IconPictureInPicture size={16} />
        </button>
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
          onClick={onToggleDevTools}
          title="Dev tools"
        >
          <IconCode size={16} />
        </button>

        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
          onClick={onCapturePage}
          title="Capture Page"
        >
          <IconCamera size={16} />
        </button>

        {extension.vault ? (
          <button
            className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all text-[10px] font-semibold"
            onClick={onOpenVaultManager}
            title="Open Vault Manager"
          >
            <IconKey size={16} />
          </button>
        ) : (
          ""
        )}

        {extension.translate ? (
          <button
            className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
            onClick={onOpenTranslateManager}
            title="Open Translate Manager"
          >
            <IconLanguage size={16} />
          </button>
        ) : (
          ""
        )}
        {extension.userscript ? (
          <button
            className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
            onClick={onOpenUserscriptManager}
            title="Open Tampermonkey Manager"
          >
            <IconCodeDots size={16} />
          </button>
        ) : (
          ""
        )}

        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1 transition-all"
          onClick={() => useAiSidebarStore.getState().toggle()}
          title="AI Sidebar"
        >
          <IconBrain size={16} />
        </button>

        <div className="text-green-600 text-xs gap-0.5 flex items-center">
          <IconShieldCancel size={16} />
          {stats?.blockedRequests}
        </div>
      </div>
    </div>
  );
};

export default Header;
