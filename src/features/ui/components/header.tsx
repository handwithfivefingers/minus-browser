import { IconChevronLeft, IconChevronRight, IconCode, IconReload, IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useThemeValues } from "~/context/theme";

interface IHeader {
  url?: string;
  onSearch: (v: string) => void;
  onBackWard: () => void;
  onForward: () => void;
  onToggleDevTools: () => void;
  onReload: () => void;
}
const Header = ({ url, onSearch, onBackWard, onForward, onToggleDevTools, onReload }: IHeader) => {
  const ref = useRef<HTMLInputElement>(null);
  const [focus, setFocus] = useState(false);
  const v = useThemeValues();

  useEffect(() => {
    if (url && ref.current && url !== ref.current.value) {
      ref.current.value = url;
    }
  }, [url]);

  const handleSearch = () => {
    const v = ref.current.value;
    onSearch(v);
  };

  return (
    <div className="flex gap-2 border-b border-slate-200 px-2 py-1 justify-between">
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <button className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1" onClick={onBackWard}>
          <IconChevronLeft size={16} />
        </button>
        <button className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1" onClick={onForward}>
          <IconChevronRight size={16} />
        </button>
      </div>
      <div
        className={[
          "flex gap-1 w-1/2 bg-white rounded-full  border-2 transition-all relative mx-auto",
          (focus && "border-indigo-500/50") || "border-transparent",
        ].join(" ")}
      >
        <button
          onClick={onReload}
          className="hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute left-0.5 top-0.5 rounded-full"
        >
          <IconReload size={16} />
        </button>
        <input
          className=" pl-8 pr-10 py-1.5 w-full rounded-full transition-all outline-transparent outline bg-white text-sm"
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
        <button
          className="hover:text-white transition-all px-1.5 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-0.5 top-0.5 rounded-full"
          onClick={handleSearch}
        >
          <IconSearch size={16} />
        </button>
      </div>
      <div className="text-sm text-slate-500 border-slate-300 px-2 rounded flex gap-2 items-center">
        <button className="hover:bg-indigo-500 rounded hover:text-white cursor-pointer p-1" onClick={onToggleDevTools}>
          <IconCode size={16} />
        </button>
      </div>
    </div>
  );
};

export default Header;
