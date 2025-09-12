import clsx from "clsx";
import { memo } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { ITab } from "../../../browsers/interfaces";
import { Avatar } from "../avatar";
/** @ts-ignore */
import styles from "./styles.module.css";
import { IconX } from "@tabler/icons-react";
import { useTabStore } from "../../stores/useTabStore";
interface ITabItem extends Omit<ITab, "updateTitle" | "updateUrl" | "onFocus" | "onBlur"> {
  className?: string;
}

const TabItem = memo(({ id, className, ...props }: ITabItem) => {
  const location = useLocation();
  const navigate = useNavigate();
  const tabStore = useTabStore();
  const onCloseTab = async () => {
    window.api.EMIT("ON_CLOSE_TAB", { ...props, id });
    const resp = tabStore.closeTab({ ...props, id });
    console.log("resp", resp);
    navigate(`/`);
  };
  return (
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
          className
        )}
        title={props.title}
      >
        <Avatar src={props?.favicon} />
        <span className={styles.title}>{props?.title}</span>
      </Link>
      <IconX
        className={clsx(
          "absolute right-0 top-0 rounded  hover:text-red-600 cursor-pointer z-[1] transition-colors",
          styles.closeIcon
        )}
        onClick={onCloseTab}
        size={16}
      />
    </div>
  );
});

export { TabItem };
