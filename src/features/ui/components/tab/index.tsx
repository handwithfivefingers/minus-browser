import { IconError404, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { memo } from "react";
import { Link, useLocation } from "react-router";
import { useTabStore } from "../../stores/useTabStore";
import { Avatar } from "../avatar";
/** @ts-ignore */
import styles from "./styles.module.css";
import { ErrorBoundary } from "react-error-boundary";
interface ITabItem extends Omit<any, "updateTitle" | "updateUrl" | "onFocus" | "onBlur"> {
  className?: string;
  onClose: ({ id }: { id: string }) => void;
}

const TabItem = memo(({ id, className, onClose, ...props }: ITabItem) => {
  const location = useLocation();
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const tab = useTabStore((s) => s.tabs.find((item) => item.id === id));
  return (
    <ErrorBoundary FallbackComponent={ComponentError}>
      <div className={styles.tabItem}>
        <Link
          to={`/${id}`}
          viewTransition
          className={clsx(
            `z-0 h-10 w-full p-1 rounded-md flex flex-row gap-1 justify-start items-center cursor-pointer hover:bg-white hover:text-indigo-500 transition-colors relative overflow-hidden`,
            {
              [`bg-white text-indigo-500 shadow-md`]: location.pathname == `/${id}`,
              [`text-indigo-500`]: location.pathname !== `/${id}`,
            },
            className,
          )}
          title={tab?.title}
          onClick={() => setActiveTab(id)}
        >
          <Avatar src={tab?.favicon} />
          <span className={styles.title}>{typeof tab?.title === "string" ? tab?.title : "New Tab"}</span>
        </Link>
        <IconX
          className={clsx(
            "absolute right-0 top-0 rounded  hover:text-red-600 cursor-pointer z-[1] transition-colors",
            styles.closeIcon,
          )}
          onClick={() => onClose({ id })}
          size={16}
        />
      </div>
    </ErrorBoundary>
  );
});
const ComponentError = ({ error }: { error: Error }) => {
  console.log("Stack", error.stack);
  console.log("Name", error.name);
  return (
    <div>
      <IconError404 />
    </div>
  );
};
export { TabItem };
