import {
  IconChevronRight,
  IconDragDrop,
  IconDragDrop2,
  IconGripVertical,
  IconHome,
  IconPlus,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { useTabStore } from "../../stores/useTabStore";
import { TabItem } from "../tab";
/** @ts-ignore */
import styles from "./styles.module.css";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { ITab } from "~/features/browsers";
interface IResizeProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}
const SideMenu = () => {
  const { tabs, addNewTab } = useTabStore();
  const pathname = useLocation().pathname;
  const onClose = useCallback(() => {
    window.api.EMIT("CLOSE_APP");
  }, []);
  const onAddNewTab = async () => {
    const tab = await window.api.INVOKE<Partial<ITab>>("CREATE_TAB");
    addNewTab(tab);
  };

  return (
    <ResizableSidebar initialWidth={56} minWidth={30} maxWidth={350} className={clsx(styles.sidebar)}>
      <div className="flex gap-1 flex-col flex-1 overflow-y-auto overflow-x-hidden h-full scrollbar ">
        <div className={clsx("w-full flex gap-0.5 items-center h-8 sticky z-[1] top-0 bg-slate-100 pb-2")}>
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
          viewTransition
          className={clsx(
            `h-10 shrink-0 px-0.5 transition-all rounded-md flex items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
            {
              [`bg-white text-slate-500 shadow-md`]: pathname === "/",
              [`text-slate-500`]: pathname !== "/",
            }
          )}
        >
          <IconHome />
        </Link>
        {tabs
          ?.filter((tab) => tab)
          ?.map((tab) => {
            return (
              <TabItem {...tab} key={tab.id} className={clsx("flex flex-col  items-center", styles.tabItem, {})} />
            );
          })}
        <div
          onClick={() => onAddNewTab()}
          className={clsx(
            `sticky z-[1] bottom-0 h-10 px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-500 shrink-0 bg-slate-100`
          )}
          title="New Tab"
        >
          <IconPlus />
        </div>
      </div>
      <div className="flex flex-col gap-2 shrink-0 rounded-full px-1">
        <Link
          to="/setting"
          className={clsx(
            `h-10 px-0.5 transition-all rounded-md flex items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
            {
              [`bg-white text-slate-500 shadow-md`]: pathname === "/setting",
              [`text-slate-500`]: pathname !== "/setting",
            }
          )}
          title="Setting"
        >
          <IconSettings />
        </Link>
        <span className="font-normal text-xs text-center">Tab: {tabs.filter((item) => !!item).length}</span>
      </div>
    </ResizableSidebar>
  );
};

const LAYOUT_SIDEBAR_CLASS = {
  BASIC: "flex-shrink-0 flex flex-col px-1 py-2 bg-slate-100 gap-1.5 transition-all h-full border-r border-slate-300",
  FLOATING: "flex-shrink-0 flex flex-col px-1 py-2 bg-slate-100 gap-1.5 transition-all rounded-lg h-full",
};

const ResizableSidebar = ({
  className,
  children,
  initialWidth = 250,
  minWidth = 150,
  maxWidth = 600,
}: IResizeProps) => {
  const [width, setWidth] = useState(initialWidth);
  const [isDragging, setIsDragging] = useState(false);
  const sidebarRef = useRef(null);
  const { layout } = useMinusThemeStore();

  // Start resize when mousedown on the drag handle
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  // Handle resize during mousemove
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isDragging) return;

      // Calculate new width based on mouse position
      const newWidth = e.clientX;

      // Apply min/max constraints
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    };

    const stopResize = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleResize);
      document.addEventListener("mouseup", stopResize);
    }

    return () => {
      document.removeEventListener("mousemove", handleResize);
      document.removeEventListener("mouseup", stopResize);
    };
  }, [isDragging, minWidth, maxWidth]);

  return (
    <div
      ref={sidebarRef}
      className={clsx("sidebar-container ", LAYOUT_SIDEBAR_CLASS[layout], className)}
      style={{
        width: `${width}px`,
        position: "relative",
        height: "100%",
        transition: isDragging ? "none" : "width 0.1s ease-out",
        overflow: "hidden",
      }}
    >
      <div className="sidebar-content flex flex-col gap-1 h-full" style={{ width: "100%" }}>
        {children}
      </div>

      {/* Resize handle */}
      <div
        className="resize-handle hover:bg-slate-500"
        onMouseDown={startResize}
        style={{
          position: "absolute",
          right: "0",
          top: "0",
          bottom: "0",
          width: "4px",
          cursor: "col-resize",
          backgroundColor: isDragging ? "#718096" : "transparent",
        }}
      />
    </div>
  );
};
export { SideMenu };
