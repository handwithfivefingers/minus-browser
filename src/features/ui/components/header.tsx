import {
  IconChevronLeft,
  IconChevronRight,
  IconCloudUp,
  IconCode,
  IconImageInPicture,
  IconLockAccess,
  IconLockAccessOff,
  IconPictureInPicture,
  IconReload,
  IconSearch,
  IconThumbDown,
  IconX,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { isValidDomain } from "../libs";
import clsx from "clsx";
interface IHeader {
  url?: string;
  onSearch: (v: string) => void;
  onBackWard: () => void;
  onToggleDevTools: () => void;
  onReload: () => void;
  onCloseTab: () => void;
  onRequestPIP: () => void;
  id: string;
}
const Header = ({ id, url, onSearch, onBackWard, onToggleDevTools, onReload, onCloseTab, onRequestPIP }: IHeader) => {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  useEffect(() => {
    if (url && ref.current && url !== ref.current.value) {
      ref.current.value = url;
      if (isValidDomain(url)) {
        const parsedURL = new URL(url);
        const toArray = [parsedURL.host, parsedURL.pathname, parsedURL.search ? `?${parsedURL.search}` : ""];
        ref.current.value = toArray.join("");
      }
    }
  }, [url]);

  useEffect(() => {
    if (!id) return;
    const onDidStartLoad = () => {
      setIsLoading(true);
    };
    const onDidFinishLoad = () => {
      setIsLoading(false);
    };
    window.api.LISTENER(`did-start-load:${id}`, onDidStartLoad);
    window.api.LISTENER(`did-stop-loading:${id}`, onDidFinishLoad);
  }, [id]);
  const handleSearch = () => {
    if (!ref.current) return;
    let v = ref.current.value;
    if (v.startsWith("http://")) v = v.slice(7);
    else if (v.startsWith("https://")) v = v.slice(8);
    onSearch(v);
  };

  const isValidHttps = url && isValidDomain(url) && new URL(url).protocol === "https:";
  const isValidHttp = url && isValidDomain(url) && new URL(url).protocol === "http:";

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
            "hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute left-0.5 top-0.5 rounded-full",
            {
              "animate-spin": isLoading,
            }
          )}
        >
          <IconReload size={16} />
        </button>
        <div className="flex pl-8 pr-10 items-center rounded-full gap-0.5 w-full">
          {isValidHttps && (
            <span className="text-sm p-1 rounded-full text-green-500">
              <IconLockAccess size={16} />
            </span>
          )}
          {isValidHttp && (
            <span className="text-sm p-1 rounded-full text-slate-500">
              <IconLockAccessOff size={16} />
            </span>
          )}
          <input
            className="py-1.5 w-full transition-all outline-transparent outline bg-white text-sm"
            ref={ref}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="Ctrl + K"
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>
        <button
          className="hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-0.5 top-0.5 rounded-full"
          onClick={handleSearch}
          title="Search"
        >
          <IconSearch size={16} />
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
      console.log('listener "SYNC"');
      setIsSync(true);
      setTimeout(() => {
        setIsSync(false);
      }, 1000);
    });
  }, []);
  return (
    <button
      className={clsx("rounded cursor-pointer p-1 transition-colors", {
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
