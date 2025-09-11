import { IconChevronRight, IconGripVertical, IconHome, IconPlus, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTabStore } from "../../stores/useTabStore";
import { TabItem } from "../tab";
/** @ts-ignore */
import styles from "./styles.module.css";

const SideMenuV2 = () => {
  const [collapse, setCollapse] = useState(true);
  const { tabs, addNewTab } = useTabStore();
  const pathname = useLocation().pathname;
  const onClose = useCallback(() => {
    window.api.EMIT("CLOSE_APP");
  }, []);
  return (
    <div
      className={clsx(
        "fixed top-2 left-2 bottom-2 z-10 rounded-md",
        "flex-shrink-0 flex flex-col p-2 bg-slate-100 gap-1.5 transition-all",
        "sidebar",
        styles.sidebar,
        {
          ["w-14"]: collapse,
          ["w-48"]: !collapse,
        }
      )}
    >
      <div className={clsx("w-full flex gap-0.5 items-center h-8")}>
        <button className={clsx("w-4 h-4 text-black", styles.appbar)}>
          <IconGripVertical size={14} />
        </button>
        <button
          className="w-3 h-3 bg-red-600/50 text-transparent rounded-full cursor-pointer hover:bg-red-600 hover:text-white"
          onClick={onClose}
        >
          <IconX size={12} />
        </button>
      </div>

      <Link
        to={"/"}
        className={clsx(
          `h-10 w-10 p-1 rounded-md flex justify-center items-center cursor-pointer hover:bg-white hover:text-slate-500 transition-colors relative overflow-hidden`,
          {
            [`bg-white text-slate-500 shadow-md`]: pathname === "/",
            [`text-slate-500`]: pathname !== "/",
            ["w-full flex gap-0.5"]: !collapse,
          }
        )}
      >
        <IconHome stroke={1.5} size={20} />
      </Link>
      {tabs
        ?.filter((tab) => tab)
        ?.map((tab) => {
          return (
            <TabItem
              {...tab}
              key={tab.id}
              className={clsx("flex flex-col  items-center", styles.tabItem, {
                ["w-full flex-row justify-start px-2 gap-2 [&>span]:text-sm"]: !collapse,
                ["flex-col justify-center"]: collapse,
              })}
            />
          );
        })}
      <div
        onClick={() => addNewTab()}
        className={clsx(
          `h-10 px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors relative overflow-hidden text-slate-500`
        )}
      >
        <IconPlus />
      </div>

      <div
        onClick={() => setCollapse(!collapse)}
        className={clsx(
          ` mt-auto h-10  px-0.5 transition-all rounded-md flex items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
          {
            ["rotate-180 w-full"]: !collapse,
            ["rotate-0 w-10"]: !collapse,
          }
        )}
      >
        <IconChevronRight />
      </div>
    </div>
  );
};

export { SideMenuV2 };
