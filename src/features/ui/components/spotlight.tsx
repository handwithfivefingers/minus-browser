import { IconChevronRight, IconSearch } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { isValidDomainOrIP } from "../libs";

const Spotlight = () => {
  return createPortal(SpotlightWrapper(), document.body);
};

const SpotlightWrapper = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    return () => {
      setIsReady(false);
    };
  }, []);
  return (
    <div
      className={[
        "fixed top-0 left-0 z-[999999] w-full h-full transition-all",
        (isReady && "bg-slate-800/90") || "bg-transparent",
      ].join(" ")}
    >
      <SportlightContent />
    </div>
  );
};

const SportlightContent = () => {
  const ref = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const handleNavigate = () => {
    const v = ref.current.value;
    const isValidURL = isValidDomainOrIP(v);
    if (isValidURL) {
      navigate(`/${v}`);
    }
  };
  const handleSearch = () => {
    const v = ref.current.value;
    window.api.INVOKE("SEARCH_PAGE", { data: v });
  };
  const [focus, setFocus] = useState(false);

  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
    ref.current.focus();
    return () => {
      setIsReady(false);
    };
  }, []);

  return (
    <div
      className={[
        "flex justify-center items-center h-screen transition-all flex-col -translate-y-20 gap-10",
        (isReady && "opacity-100") || "opacity-0",
      ].join(" ")}
    >
      <h2 className="text-white font-bold text-4xl text-center">What are you looking for ... ?</h2>
      <div
        className={[
          "flex gap-1 w-1/2 bg-white rounded-full  border-2 transition-all relative  ",
          (focus && "border-indigo-500/50") || "border-transparent",
        ].join(" ")}
      >
        <input
          className=" pl-4 pr-10 py-1.5 w-full rounded-full transition-all outline-transparent outline bg-white "
          ref={ref}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder="Search ..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handleSearch();
            }
          }}
        />
        <button
          className="hover:text-white transition-all px-2 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-10 top-0.5 rounded-full"
          onClick={handleNavigate}
        >
          <IconChevronRight size={16} />
        </button>
        <button
          className="hover:text-white transition-all px-2 py-1 h-[calc(100%-4px)] hover:bg-indigo-500/50 cursor-pointer active:translate-y-0.5 text-indigo-500  absolute right-0.5 top-0.5 rounded-full"
          onClick={handleSearch}
        >
          <IconSearch size={16} />
        </button>
      </div>
    </div>
  );
};

export { Spotlight };
