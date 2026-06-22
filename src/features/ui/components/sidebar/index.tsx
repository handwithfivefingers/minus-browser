import { IconGripVertical, IconHistory, IconHome, IconPlus, IconSettings, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Tab } from "../../interfaces/tab";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { useTabStore } from "../../stores/useTabStore";
import { TabItem } from "../tab";
/** @ts-ignore */
import styles from "./styles.module.css";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";

type DragState = {
  id: string;
  index: number;
  startY: number;
};

interface IResizeProps {
  children: React.ReactNode;
  initialWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  className?: string;
}

const SideMenu = () => {
  const navigate = useNavigate();
  const pathname = useLocation().pathname;
  const tabs = useTabStore((s) => s.tabs);

  const pinnedTabs = useMemo(() => tabs.filter((t) => t.isPinned), [tabs]);
  const unpinnedTabs = useMemo(() => tabs.filter((t) => !t.isPinned), [tabs]);

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ tabId: string; position: "before" | "after" } | null>(null);
  const dropTargetRef = useRef<{ tabId: string; position: "before" | "after" } | null>(null);
  const dragState = useRef<DragState | null>(null);
  const active = useRef(false);

  useEffect(() => {
    window.api.LISTENER("CREATE_TAB", (p) => {
      onAddNewTab(p);
    });
  }, []);

  const onClose = useCallback(() => {
    window.api.EMIT("CLOSE_APP");
  }, []);

  const onAddNewTab = async (payload: Partial<Tab>) => {
    const tab = await window.api.INVOKE<Tab>("CREATE_TAB", payload);
    setTimeout(() => {
      tab.id && navigate(tab.id);
    }, 500);
  };

  const onCloseTab = async ({ id }: { id: string }) => {
    window.api.EMIT("ON_CLOSE_TAB", { id });
    navigate(`/`);
  };

  // Unified drag system — one set of global listeners
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const ds = dragState.current;
      if (!ds) return;

      if (!active.current && Math.abs(clientY - ds.startY) > 5) {
        active.current = true;
        setDraggedTabId(ds.id);
      }
      if (!active.current) return;

      const el = document.elementFromPoint("touches" in e ? e.touches[0].clientX : e.clientX, clientY);
      const wrapper = el?.closest<HTMLElement>("[data-dnd-id]");
      if (wrapper) {
        const targetId = wrapper.dataset.dndId!;
        if (targetId !== ds.id) {
          const rect = wrapper.getBoundingClientRect();
          const relY = clientY - rect.top;
          const position: "before" | "after" = relY < rect.height / 2 ? "before" : "after";
          const next = { tabId: targetId, position };
          dropTargetRef.current = next;
          setDropIndicator(next);
        } else {
          dropTargetRef.current = null;
          setDropIndicator(null);
        }
      } else {
        dropTargetRef.current = null;
        setDropIndicator(null);
      }
    };

    const handleUp = () => {
      const ds = dragState.current;
      const dt = dropTargetRef.current;
      if (active.current && ds && dt && dt.tabId !== ds.id) {
        const currentUnpinned = tabs.filter((t) => !t.isPinned);
        const currentPinned = tabs.filter((t) => t.isPinned);
        const draggedIdx = currentUnpinned.findIndex((t) => t.id === ds.id);
        const targetIdx = currentUnpinned.findIndex((t) => t.id === dt.tabId);
        if (draggedIdx !== -1 && targetIdx !== -1) {
          const newUnpinned = [...currentUnpinned];
          const [removed] = newUnpinned.splice(draggedIdx, 1);
          newUnpinned.splice(targetIdx, 0, removed);
          const orderedIds = [...currentPinned.map((t) => t.id), ...newUnpinned.map((t) => t.id)];
          window.api.EMIT("REORDER_TABS", { orderedIds });
        }
      }
      active.current = false;
      dragState.current = null;
      dropTargetRef.current = null;
      setDraggedTabId(null);
      setDropIndicator(null);
    };

    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
    document.addEventListener("touchmove", handleMove, { passive: true });
    document.addEventListener("touchend", handleUp);
    return () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleUp);
    };
  }, [tabs]);

  const getDragHandleProps = useCallback(
    (tabId: string, index: number) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        dragState.current = { id: tabId, index, startY: e.clientY };
      },
      onTouchStart: (e: React.TouchEvent) => {
        dragState.current = { id: tabId, index, startY: e.touches[0].clientY };
      },
    }),
    [],
  );

  return (
    <ErrorBoundary FallbackComponent={(fallbackProps) => <ComponentError {...fallbackProps} />}>
      <ResizableSidebar initialWidth={56} minWidth={30} maxWidth={350} className={clsx(styles.sidebar)}>
        <div className="flex gap-1 flex-col flex-1 overflow-y-auto overflow-x-hidden h-full scrollbar ">
          <div className={clsx("w-full flex gap-0.5 items-center h-8 sticky z-1 top-0 bg-slate-100 pb-2")}>
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
              },
            )}
          >
            <IconHome />
          </Link>

          {/* Pinned tabs section */}
          {pinnedTabs.length > 0 && (
            <div className={styles.pinnedGroup}>
              <span className={styles.pinnedLabel}>Pinned</span>
              {pinnedTabs.map((tab) => (
                <TabItem
                  {...tab}
                  key={tab.id}
                  className={clsx("flex flex-col items-center", styles.tabItem, styles.pinnedTab)}
                  onClose={onCloseTab}
                />
              ))}
            </div>
          )}

          {/* Unpinned tabs section */}
          <div className={styles.unpinnedGroup}>
            {unpinnedTabs.map((tab, idx) => {
              const handleProps = getDragHandleProps(tab.id, idx);
              return (
                <div key={tab.id} className={styles.dndItemWrapper} data-dnd-id={tab.id}>
                  {dropIndicator?.tabId === tab.id && dropIndicator?.position === "before" && (
                    <div className={styles.dropLine} />
                  )}
                  <TabItem
                    {...tab}
                    className={clsx("flex flex-col items-center", styles.tabItem, {
                      [styles.dragOverTop]: dropIndicator?.tabId === tab.id && dropIndicator?.position === "before",
                      [styles.dragOverBottom]: dropIndicator?.tabId === tab.id && dropIndicator?.position === "after",
                    })}
                    onClose={onCloseTab}
                    isDragging={draggedTabId === tab.id}
                    dragHandleProps={handleProps}
                  />
                  {dropIndicator?.tabId === tab.id && dropIndicator?.position === "after" && (
                    <div className={styles.dropLine} />
                  )}
                </div>
              );
            })}
          </div>

          <div
            onClick={() => onAddNewTab({})}
            className={clsx(
              `sticky z-1 bottom-0 h-10 px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-500 shrink-0 bg-slate-100`,
            )}
            title="New Tab"
          >
            <IconPlus />
          </div>
          {/* SUB MENU */}
        </div>
        <SubMenuItem size={tabs?.length} />
      </ResizableSidebar>
    </ErrorBoundary>
  );
};

const SubMenuItem = ({ size }: { size: number }) => {
  const pathname = useLocation().pathname;
  return (
    <div className="flex flex-col gap-2 shrink-0 rounded-full px-1">
      <Link
        to="/history"
        className={clsx(
          `h-10 px-0.5 transition-all rounded-md flex items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
          {
            [`bg-white text-slate-500 shadow-md`]: pathname === "/history",
            [`text-slate-500`]: pathname !== "/history",
          },
        )}
        title="History"
      >
        <IconHistory />
      </Link>
      <Link
        to="/setting"
        className={clsx(
          `h-10 px-0.5 transition-all rounded-md flex items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
          {
            [`bg-white text-slate-500 shadow-md`]: pathname === "/setting",
            [`text-slate-500`]: pathname !== "/setting",
          },
        )}
        title="Setting"
      >
        <IconSettings />
      </Link>
      <span className="font-normal text-xs text-center">Tab: {size > 0 ? size : "0"}</span>
    </div>
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
      className={clsx(
        "sidebar-container ",
        LAYOUT_SIDEBAR_CLASS[layout as keyof typeof LAYOUT_SIDEBAR_CLASS],
        className,
      )}
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
const ComponentError = ({ error }: FallbackProps) => {
  console.error("Stack", (error as Error)?.stack);
  console.error("Name", (error as Error)?.name);
  return <div>Error: {(error as Error)?.message}</div>;
};
export { SideMenu };
