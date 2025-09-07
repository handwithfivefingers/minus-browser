import { IconChevronRight, IconHome, IconPlus } from "@tabler/icons-react";
import clsx from "clsx";
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useTabStore } from "../stores/useTabStore";
import { TabItem } from "./tab";

const SideMenu = () => {
  const [collapse, setCollapse] = useState(true);
  const { tabs, addNewTab } = useTabStore();
  const pathname = useLocation().pathname;
  return (
    <div
      className={clsx("flex-shrink-0 flex flex-col p-2 bg-slate-100 h-screen gap-1.5 transition-all", {
        ["w-14"]: collapse,
        ["w-48"]: !collapse,
      })}
    >
      <Link
        to={"/"}
        className={clsx(
          `h-10 w-10 p-1 rounded-md flex justify-center items-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative overflow-hidden`,
          {
            [`bg-indigo-500/50 text-white`]: pathname === "/",
            [`text-indigo-500`]: pathname !== "/",
            ["w-full flex gap-0.5"]: !collapse,
          }
        )}
      >
        <IconHome />
      </Link>
      {tabs?.map((tab) => {
        return (
          <TabItem
            {...tab}
            key={tab.id}
            className={clsx("flex flex-col  items-center", {
              ["w-full flex-row justify-start px-2 gap-2 [&>span]:text-sm"]: !collapse,
              ["flex-col justify-center"]: collapse,
            })}
          />
        );
      })}
      <div
        onClick={() => addNewTab()}
        className={clsx(
          `h-10 px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative overflow-hidden text-indigo-500`,
          {
            ["rotate-180 w-full"]: !collapse,
            ["rotate-0 w-10"]: !collapse,
          }
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

export { SideMenu };
