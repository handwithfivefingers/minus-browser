import {
  IconChevronLeft,
  IconCloudUp,
  IconCode,
  IconLockAccess,
  IconLockAccessOff,
  IconPictureInPicture,
  IconReload,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { isValidDomain } from "../libs";
interface IHeader {
  url?: string;
  onSearch: (v: string) => void;
  onBackWard: () => void;
  onToggleDevTools: () => void;
  onReload: () => void;
  onCloseTab: () => void;
  onRequestPIP: () => void;
  title?: string;
  isLoading: boolean;
}
const Header = ({
  title,
  isLoading,
  url,
  onSearch,
  onBackWard,
  onToggleDevTools,
  onReload,
  onCloseTab,
  onRequestPIP,
}: IHeader) => {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  useEffect(() => {
    if (url && ref.current && url !== ref.current.value) {
      ref.current.value = url;
      if (isValidDomain(url)) {
        const parsedURL = new URL(url);
        const toArray = [parsedURL.host, parsedURL.pathname, parsedURL.search ? `${parsedURL.search}` : ""];
        ref.current.value = toArray.join("");
      }
    }
  }, [url]);

  const handleSearch = () => {
    if (!ref.current) return;
    let v = ref.current.value;
    // if (v.startsWith("http://")) v = v.slice(7);
    // else if (v.startsWith("https://")) v = v.slice(8);
    onSearch(v);
  };

  // const isValidHttps = url && isValidDomain(url) && new URL(url).protocol === "https:";
  // const isValidHttp = url && isValidDomain(url) && new URL(url).protocol === "http:";

  return (
    <div className="flex gap-2 border-b border-slate-200 px-2 py-1 justify-between">
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1"
          onClick={onBackWard}
          title="Go back"
        >
          <IconChevronLeft size={16} />
        </button>
      </div>
      <div
        className={[
          "flex gap-1 w-1/2 bg-white rounded-full  border-2 transition-all relative mx-auto",
          (focus && "border-indigo-500/50") || "border-transparent",
        ].join(" ")}
      >
        {" "}
        <button
          onClick={onCloseTab}
          className={clsx(
            "hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-red-700/50 cursor-pointer active:translate-y-0.5 text-red-700  absolute -left-10 top-0.5 rounded-full"
          )}
          title="Close tab"
        >
          <IconX size={16} />
        </button>
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
          {/* {isValidHttps && (
            <span className="text-sm p-1 rounded-full text-green-500">
              <IconLockAccess size={16} />
            </span>
          )}
          {isValidHttp && (
            <span className="text-sm p-1 rounded-full text-slate-500">
              <IconLockAccessOff size={16} />
            </span>
          )} */}
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
              ref.current.focus();
            }}
            placeholder="Ctrl + K"
            title={title}
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
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <Sync />
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1"
          onClick={onRequestPIP}
          title="Picture in picture"
        >
          <IconPictureInPicture size={16} />
        </button>
        <button
          className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1"
          onClick={onToggleDevTools}
          title="Dev tools"
        >
          <IconCode size={16} />
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
