import { IconError404, IconPin, IconPinFilled, IconVolume, IconX, IconGripVertical } from "@tabler/icons-react";
import clsx from "clsx";
import { memo, useCallback } from "react";
import { Link, useLocation } from "react-router";
import { useTabStore } from "../../stores/useTabStore";
import { Avatar } from "../avatar";
/** @ts-ignore */
import styles from "./styles.module.css";
import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { ITab } from "~/shared/types";
interface ITabItem extends Omit<ITab, "updateTitle" | "updateUrl" | "onFocus" | "onBlur" | "id"> {
  id: string;
  className?: string;
  onClose: ({ id }: { id: string }) => void;
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void;
  isDragging?: boolean;
  dragHandleProps?: {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
  groupColor?: string;
}

const TabItem = memo(({ id, className, onClose, onContextMenu, isDragging, dragHandleProps, groupColor, ...props }: ITabItem) => {
  const location = useLocation();
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const tab = useTabStore((s) => s.tabs.find((item) => item.id === id));

  const onTogglePin = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.api.INVOKE("TOGGLE_PIN_TAB", { id });
    },
    [id],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onContextMenu?.(e, id);
    },
    [id, onContextMenu],
  );

  return (
    <ErrorBoundary FallbackComponent={ComponentError}>
      <div
        className={clsx(styles.tabItem, "group overflow-hidden rounded-md flex", { [styles.dragging]: isDragging })}
        // style={groupColor ? { borderLeft: `3px solid ${groupColor}` } : undefined}
        onContextMenu={handleContextMenu}
        {...dragHandleProps}
      >
        <Link
          to={`/${id}`}
          viewTransition
          className={clsx(
            `z-0 h-10 w-full p-1  flex flex-row gap-1 justify-start items-center cursor-pointer hover:bg-white hover:text-indigo-500 transition-colors relative overflow-hidden`,
            {
              [`bg-white text-indigo-500 shadow-md`]: location.pathname == `/${id}`,
              [`text-indigo-500`]: location.pathname !== `/${id}`,
            },
            className,
          )}
          title={tab?.title}
          onClick={() => setActiveTab(id)}
        >
          <div className="flex relative">
            <Avatar src={tab?.favicon} />
            {tab?.audible && (
              <IconVolume
                className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 text-slate-700"
                size={12}
              />
            )}
          </div>

          <span className={styles.title}>{typeof tab?.title === "string" ? tab?.title : "New Tab"}</span>
        </Link>

        <div
          className={clsx(
            styles.actionsOverlay,
            "border-l border-slate-200 hidden group-hover:flex flex-col right-0",
            {},
          )}
        >
          <button className={styles.actionButton} onClick={onTogglePin} title={tab?.isPinned ? "Unpin tab" : "Pin tab"}>
            {tab?.isPinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
          </button>
          <IconX className={clsx(styles.actionButton, styles.closeBtn)} onClick={() => onClose({ id })} size={14} />
        </div>
      </div>
    </ErrorBoundary>
  );
});
const ComponentError = ({ error }: FallbackProps) => {
  console.error("Stack", ( error as Error)?.stack);
  console.error("Name", ( error as Error)?.name);
  return (
    <div>
      <IconError404 />
    </div>
  );
};
export { TabItem };
