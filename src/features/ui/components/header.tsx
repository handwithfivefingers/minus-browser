import {
  IconChevronLeft,
  IconCloudUp,
  IconCode,
  IconPictureInPicture,
  IconReload,
  IconSearch,
  IconStarFilled,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { isValidDomainOrIP } from "../libs";
import { useMinusThemeStore } from "../stores/useMinusTheme";
import { Switch } from "./switch";
interface IHeader {
  url?: string;
  id: string;
  onSearch: (v: string) => void;
  onBackWard: () => void;
  onToggleDevTools: () => void;
  onReload: () => void;
  onRequestPIP: () => void;
  title?: string;
  isLoading: boolean;
  isBookmarked: boolean;
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
  onSearch,
  onBackWard,
  onToggleDevTools,
  onReload,
  onRequestPIP,
}: IHeader) => {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const { layout } = useMinusThemeStore();

  useEffect(() => {
    if (url && ref.current && url !== ref.current.value) {
      ref.current.value = url;
      if (isValidDomainOrIP(url)) {
        ref.current.value = url;
      }
    }
  }, [url]);

  const handleSearch = () => {
    if (!ref.current) return;
    let v = ref.current.value;
    console.log("v", v);
    onSearch(v);
  };
  const onBookmark = () => {
    window.api.EMIT("TOGGLE_BOOKMARK", { url: ref.current.value, id: id });
  };
  return (
    <div className={LAYOUT_HEADER_CLASS[layout]}>
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1"
          onClick={onBackWard}
          title="Go back"
        >
          <IconChevronLeft size={16} />
        </button>
      </div>
      <div className="bg-slate-200 px-4 rounded-full">
        <Switch title={"Hibernate"} />
      </div>
      <div
        className={[
          "flex gap-1 w-1/2 bg-white rounded-full  border-2 transition-all relative mx-auto",
          (focus && "border-indigo-500/50") || "border-transparent",
        ].join(" ")}
      >
        {" "}
        <button
          onClick={onReload}
          className={clsx(
            "hover:text-white transition-all px-1 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute left-0.5 top-0.5 rounded-full",
            {
              "animate-spin": isLoading,
            }
          )}
        >
          <IconReload size={12} />
        </button>
        <div className="flex px-6 items-center rounded-full gap-0.5 w-full">
          <input
            className={clsx("py-1 w-full transition-all outline-transparent outline bg-white text-xs", {
              ["hidden"]: !focus,
            })}
            ref={ref}
            onBlur={() => setFocus(false)}
            placeholder="Ctrl + K"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            title={ref.current?.value}
          />
          <input
            className={clsx("py-1 w-full transition-all outline-transparent outline bg-white text-xs", {
              ["hidden"]: focus,
            })}
            value={title}
            onFocus={() => {
              setFocus(true);
              setTimeout(() => {
                ref.current.focus();
              }, 50);
            }}
            placeholder="Ctrl + K"
            title={title}
            readOnly
          />
        </div>
        <button
          className="hover:text-white transition-all  px-1 py-1  h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-0.5 top-0.5 rounded-full"
          onClick={handleSearch}
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
      {isSync && <span className="text-[8px] absolute right-6 top-2">Synced</span>}
      <IconCloudUp size={16} />
    </button>
  );
};

export default Header;
