import {
  IconComponents,
  IconGripVertical,
  IconHistory,
  IconHome,
  IconPlus,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  IPC_TAB_GROUP_EMIT,
  IPC_TAB_GROUP_INVOKE,
  IPC_TAB_GROUP_RENDERER_EVENT,
} from "~/shared/constants/ipc/tabGroup";
import { Tab } from "../../interfaces/tab";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
import { useTabGroupStore } from "../../stores/useTabGroupStore";
import { useTabStore } from "../../stores/useTabStore";
import { TabItem } from "../tab";
import { TabGroupContainer } from "../tabGroup";
import { NotificationBell } from "../../features/notification";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
/** @ts-ignore */
import styles from "./styles.module.css";

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

  const groups = useTabGroupStore((s) => s.groups);
  const setGroups = useTabGroupStore((s) => s.setGroups);

  const pinnedTabs = useMemo(() => tabs.filter((t) => t.isPinned), [tabs]);
  const unpinnedTabs = useMemo(() => tabs.filter((t) => !t.isPinned), [tabs]);
  const visibleGroups = useMemo(() => groups.filter((g) => !g.hidden), [groups]);
  const groupedTabIds = useMemo(() => new Set(groups.flatMap((g) => g.tabIds)), [groups]);
  const ungroupedTabs = useMemo(
    () => unpinnedTabs.filter((t) => !groupedTabIds.has(t.id)),
    [unpinnedTabs, groupedTabIds],
  );
  const groupedTabsByGroup = useMemo(() => {
    const map = new Map<string, Tab[]>();
    for (const group of groups) {
      const groupTabs: Tab[] = [];
      for (const tabId of group.tabIds) {
        const tab = unpinnedTabs.find((t) => t.id === tabId);
        if (tab) groupTabs.push(tab);
      }
      map.set(group.id, groupTabs);
    }
    return map;
  }, [groups, unpinnedTabs]);

  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    tabId: string;
    position: "before" | "after";
    groupId?: string;
  } | null>(null);
  // Group creation is handled by the overlay (SHOW_TAB_CONTEXT_MENU)
  const dropTargetRef = useRef<{ tabId: string; position: "before" | "after"; groupId?: string } | null>(null);
  const dragState = useRef<(DragState & { groupId?: string }) | null>(null);
  const active = useRef(false);

  useEffect(() => {
    (async () => {
      const groups = await window.api.INVOKE<any>(IPC_TAB_GROUP_INVOKE.GET_TAB_GROUPS);
      if (groups) setGroups(groups);
    })();
    window.api.LISTENER("CREATE_TAB", (p) => {
      onAddNewTab(p);
    });
    window.api.LISTENER(IPC_TAB_GROUP_RENDERER_EVENT.TAB_GROUP_UPDATED, (data) => {
      setGroups(data as any);
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
    const currentTabs = useTabStore.getState().tabs;
    const closedIndex = currentTabs.findIndex((t) => t.id === id);
    const isActiveTab = pathname === `/${id}`;

    window.api.EMIT("ON_CLOSE_TAB", { id });

    if (isActiveTab) {
      if (currentTabs.length <= 1) {
        navigate(`/`);
      } else if (closedIndex > 0) {
        navigate(`/${currentTabs[closedIndex - 1].id}`);
      } else {
        navigate(`/${currentTabs[1].id}`);
      }
    }
  };

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault();
      const tab = tabs.find((t) => t.id === tabId);
      const group = groups.find((g) => g.tabIds.includes(tabId));
      window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
        tabId,
        currentGroupId: group?.id || tab?.groupId,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [tabs, groups],
  );

  const handleGroupContextMenu = useCallback((e: React.MouseEvent, groupId: string) => {
    e.preventDefault();
    window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
      groupId,
      x: e.clientX,
      y: e.clientY,
    });
  }, []);

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
      const groupHeader = el?.closest<HTMLElement>("[data-group-id]");
      if (wrapper) {
        const targetId = wrapper.dataset.dndId!;
        const targetGroupId = wrapper.dataset.groupId || ds.groupId;
        if (targetId !== ds.id) {
          const rect = wrapper.getBoundingClientRect();
          const relY = clientY - rect.top;
          const position: "before" | "after" = relY < rect.height / 2 ? "before" : "after";
          const next = { tabId: targetId, position, groupId: targetGroupId };
          dropTargetRef.current = next;
          setDropIndicator(next);
        } else {
          dropTargetRef.current = null;
          setDropIndicator(null);
        }
      } else if (groupHeader && ds.groupId && groupHeader.dataset.groupId !== ds.groupId) {
        // Dragging a tab onto a different group header -> move to that group
        const next = { tabId: ds.id, position: "after" as const, groupId: groupHeader.dataset.groupId };
        dropTargetRef.current = next;
        setDropIndicator(next);
      } else {
        dropTargetRef.current = null;
        setDropIndicator(null);
      }
    };

    const handleUp = () => {
      const ds = dragState.current;
      const dt = dropTargetRef.current;
      if (active.current && ds) {
        if (dt && dt.tabId !== ds.id) {
          const currentUnpinned = tabs.filter((t) => !t.isPinned);
          const currentPinned = tabs.filter((t) => t.isPinned);

          // Cross-group move
          if (dt.groupId && ds.groupId !== dt.groupId) {
            window.api.INVOKE(IPC_TAB_GROUP_INVOKE.ADD_TAB_TO_GROUP, { groupId: dt.groupId, tabId: ds.id });
          }

          // Remove from previous group if it was in one
          if (ds.groupId && (!dt || dt.groupId !== ds.groupId)) {
            window.api.INVOKE(IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP, { groupId: ds.groupId, tabId: ds.id });
          }

          // Reorder within the same context (grouped or ungrouped)
          const draggedIdx = currentUnpinned.findIndex((t) => t.id === ds.id);
          const targetIdx = currentUnpinned.findIndex((t) => t.id === dt.tabId);
          if (draggedIdx !== -1 && targetIdx !== -1) {
            const newUnpinned = [...currentUnpinned];
            const [removed] = newUnpinned.splice(draggedIdx, 1);
            newUnpinned.splice(targetIdx, 0, removed);
            const orderedIds = [...currentPinned.map((t) => t.id), ...newUnpinned.map((t) => t.id)];
            window.api.EMIT("REORDER_TABS", { orderedIds });
          }
        } else if (!dt && ds.groupId) {
          // Dragged outside any group -> remove from group
          window.api.INVOKE(IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP, { groupId: ds.groupId, tabId: ds.id });
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
    (tabId: string, index: number, groupId?: string) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        dragState.current = { id: tabId, index, startY: e.clientY, groupId };
      },
      onTouchStart: (e: React.TouchEvent) => {
        dragState.current = { id: tabId, index, startY: e.touches[0].clientY, groupId };
      },
    }),
    [],
  );

  return (
    <ErrorBoundary FallbackComponent={(fallbackProps) => <ComponentError {...fallbackProps} />}>
      <ResizableSidebar initialWidth={56} minWidth={30} maxWidth={350} className={clsx(styles.sidebar)}>
        <div className="flex gap-1 flex-col flex-1 overflow-y-auto overflow-x-hidden h-full" style={{}}>
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
              `h-8 flex flex-col shrink-0 px-0.5 transition-all rounded-md items-center justify-center cursor-pointer hover:text-indigo-500  relative overflow-hidden text-slate-800`,
              {
                [`bg-white text-slate-500 shadow-md`]: pathname === "/",
                [`text-slate-500`]: pathname !== "/",
              },
            )}
          >
            <IconHome size={16} />
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

          <div
            className="flex flex-col gap-0.5 h-full overflow-y-auto"
            style={{
              scrollbarWidth: "none",
              scrollbarColor: "rgba(99, 102, 241, 0.2) transparent",
            }}
          >
            {/* Tab groups section */}
            {visibleGroups.map((group) => {
              const groupTabs = groupedTabsByGroup.get(group.id) || [];
              return (
                <TabGroupContainer
                  data-group-id={group.id}
                  key={group.id}
                  group={group}
                  tabs={groupTabs}
                  onCloseTab={onCloseTab}
                  onContextMenu={handleContextMenu}
                  onGroupContextMenu={handleGroupContextMenu}
                  getDragHandleProps={(tabId, idx) => getDragHandleProps(tabId, idx, group.id)}
                />
              );
            })}

            {/* Ungrouped tabs section */}
            {ungroupedTabs.length > 0 && groups.length > 0 && (
              <span className={styles.pinnedLabel} style={{ marginTop: 4 }}>
                Other tabs
              </span>
            )}
            <div className={styles.unpinnedGroup}>
              {ungroupedTabs.map((tab, idx) => {
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
                      onContextMenu={handleContextMenu}
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
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-slate-300 flex flex-col items-center py-2">
          <button
            onClick={() => {
              if (tabs.length > 0) {
                const activeId = tabs.find((t) => t.isFocused)?.id || tabs[0]?.id;
                const group = groups.find((g) => g.tabIds.includes(activeId));
                window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
                  x: 100,
                  y: 100,
                });
              }
            }}
            className=" z-1 w-full px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-500 hover:text-indigo-500 shrink-0 bg-slate-100 gap-1 flex-col py-1"
            title="Group tabs together — right-click any tab to add it to a group"
          >
            <IconComponents size={16} />
            <span className="text-[10px] font-medium">Groups</span>
          </button>

          <button
            onClick={() => onAddNewTab({})}
            className=" z-1 w-full px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-500 hover:text-indigo-500 shrink-0 bg-slate-100 gap-1 flex-col py-1"
          >
            <IconPlus size={16} />
            <span className="text-[10px] font-medium">New Tab</span>
          </button>
          <NotificationBell />
          <SubMenuItem size={tabs?.length} />
        </div>
      </ResizableSidebar>
    </ErrorBoundary>
  );
};

const SubMenuItem = ({ size }: { size: number }) => {
  const pathname = useLocation().pathname;
  return (
    <>
      <Link
        to="/history"
        className={clsx(
          " z-1 w-full px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-400 hover:text-indigo-500 shrink-0 bg-slate-100 gap-1 flex-col py-1",
          {
            [`bg-white text-slate-500 shadow-md`]: pathname === "/history",
            [`text-slate-500`]: pathname !== "/history",
          },
        )}
      >
        <IconHistory size={16} />
        <span className="text-[10px] font-medium">History</span>
      </Link>
      <Link
        to="/setting"
        className={clsx(
          " z-1 w-full px-0.5 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors overflow-hidden text-slate-400 hover:text-indigo-500 shrink-0 bg-slate-100 gap-1 flex-col py-1",
          {
            [`bg-white text-slate-500 shadow-md`]: pathname === "/setting",
            [`text-slate-500`]: pathname !== "/setting",
          },
        )}
      >
        <IconSettings size={16} />
        <span className="text-[10px] font-medium">Setting</span>
      </Link>
      {/* <span className="font-normal text-xs text-center">Tab: {size > 0 ? size : "0"}</span> */}
    </>
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
