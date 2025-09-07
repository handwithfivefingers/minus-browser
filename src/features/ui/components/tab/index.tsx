import { memo } from "react";
import { ITab } from "../../../browsers/interfaces";
import { Link, useLocation } from "react-router";
import clsx from "clsx";
import { Avatar } from "../avatar";
import styles from "./styles.module.css";
interface ITabItem extends Omit<ITab, "updateTitle" | "updateUrl" | "onFocus" | "onBlur"> {
  className?: string;
}

const TabItem = memo(({ id, className, ...props }: ITabItem) => {
  const location = useLocation();
  console.log("location", location);
  return (
    <Link
      to={`/${id}`}
      className={clsx(
        `h-10 w-10 p-1 rounded-md flex justify-center items-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative overflow-hidden`,
        {
          [`bg-indigo-500/50 text-white`]: location.pathname == `/${id}`,
          [`text-indigo-500`]: location.pathname !== `/${id}`,
        },
        className
      )}
    >
      <Avatar src={props?.favicon} />
      <span className={styles.title}>{props?.title}</span>
    </Link>
  );
});

export { TabItem };
