import {
  IconBrain,
  IconChevronLeft,
  IconCloudUp,
  IconCode,
  IconCodeDots,
  IconKey,
  IconLanguage,
  IconPictureInPicture,
  IconReload,
  IconRobot,
  IconSearch,
  IconStarFilled,
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
  onTogglePreventHibernate,
}: IHeader) => {
  const { layout, extension } = useMinusThemeStore();
  const onBookmark = () => {
    window.api.EMIT("TOGGLE_BOOKMARK", { url: url, id: id });
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
      </div>
      <div
        className={[
          "flex gap-1 w-1/2 bg-white rounded-full border-2 transition-all relative mx-auto border-transparent",
        ].join(" ")}
      >
        <div className="flex gap-0.5 absolute top-0.5 left-0.5">
          <button
            onClick={onReload}
            className={clsx(
              "hover:text-white transition-all px-1 py-1 h-[calc(100%-4px)] hover:bg-indigo-500 cursor-pointer active:translate-y-0.5 text-indigo-500 rounded-full",
              {
                "animate-spin": isLoading,
              },
            )}
          >
            <IconReload size={12} />
          </button>
          <button
            className="hover:bg-indigo-500 h-[calc(100%-4px)] hover:text-white cursor-pointer p-1 active:translate-y-0.5 transition-all text-indigo-500 rounded-full"
            onClick={onTranslatePage}
            title="Translate page"
          >
            <IconLanguage size={12} />
          </button>
        </div>
        <div className="flex px-12 items-center rounded-full gap-0.5 w-full">
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
        <Sync />

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

        {extension.vault ? (
          <button
            className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer px-2 py-1 transition-all text-[10px] font-semibold"
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

        <button
          className={clsx("hover:text-yellow-500 rounded cursor-pointer p-1 transition-all", {
            ["text-yellow-500"]: isBookmarked,
          })}
          title="Bookmark"
          onClick={onBookmark}
        >
          <IconStarFilled size={16} />
        </button>
      </div>
    </div>
  );
};

const Sync = () => {
  const [isSync, setIsSync] = useState(false);
  useEffect(() => {
    window.api.LISTENER(`SYNC`, () => {
      setIsSync(true);
      setTimeout(() => {
        setIsSync(false);
      }, 1000);
    });
  }, []);
  return (
    <button
      className={clsx("rounded cursor-pointer p-1 transition-colors flex gap-0.5 relative", {
        ["text-green-500"]: isSync,
        [""]: !isSync,
      })}
      title="Sync data"
    >
      <IconCloudUp size={16} />
    </button>
  );
};

export default Header;
