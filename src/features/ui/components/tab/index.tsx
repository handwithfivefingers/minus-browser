import clsx from "clsx";
import { memo } from "react";
import { Link, useLocation } from "react-router";
import { ITab } from "../../../browsers/interfaces";
import { Avatar } from "../avatar";
/** @ts-ignore */
import styles from "./styles.module.css";
interface ITabItem extends Omit<ITab, "updateTitle" | "updateUrl" | "onFocus" | "onBlur"> {
  className?: string;
}

const TabItem = memo(({ id, className, ...props }: ITabItem) => {
  const location = useLocation();
  return (
    <Link
      to={`/${id}`}
      className={clsx(
        `h-10 w-10 p-1 rounded-md flex justify-center items-center cursor-pointer hover:bg-white hover:text-indigo-500 transition-colors relative overflow-hidden`,
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
  );
});

export { TabItem };
