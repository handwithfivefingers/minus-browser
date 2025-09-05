import { IconChevronRight, IconHome, IconPlus, IconSpider } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { ITab } from "~/features/browsers";
import { useTab } from "~/features/ui/hooks/useTab";
import clsx from "clsx";
import { Avatar } from "./avatar";

const SideMenu = () => {
  const [tabs, setTabs] = useState<ITab[]>([]);
  const [collapse, setCollapse] = useState(true);
  const { GET_TABS, CREATE_TAB } = useTab();
  useEffect(() => {
    getScreenData();
  }, []);

  const getScreenData = async () => {
    try {
      const response = await GET_TABS();
      console.log("response", response);
      setTabs(response);
    } catch (error) {
      console.error("Error getting tabs:", error);
    }
  };

  const handleCreateTab = async () => {
    try {
      const resp = await CREATE_TAB();
      console.log("resp", resp);
      return getScreenData();
    } catch (error) {
      console.log("error", error);
    }
  };
  return (
    <div
      className={clsx("flex-shrink-0 flex flex-col p-2 bg-slate-100 h-screen gap-1.5 transition-all", {
        ["w-14"]: collapse,
        ["w-48"]: !collapse,
      })}
    >
      <NavItem
        to={"/"}
        className={clsx({
          ["w-full flex gap-0.5"]: !collapse,
        })}
      >
        <IconHome />
      </NavItem>
      {tabs?.map((item) => {
        return (
          <TabItem
            {...item}
            key={item.id}
            className={clsx("flex flex-col  items-center", {
              ["w-full flex-row justify-start px-2 gap-2 [&>span]:text-sm"]: !collapse,
              ["flex-col justify-center"]: collapse,
            })}
          />
        );
      })}
      <div
        onClick={handleCreateTab}
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

const NavItem = ({ children, to, className }: { children: React.ReactNode; to: string; className?: string }) => {
  const pathname = useLocation().pathname;
  return (
    <Link
      to={to}
      className={clsx(
        `h-10 w-10 p-1 rounded-md flex justify-center items-center cursor-pointer hover:bg-indigo-500/50 hover:text-white transition-colors relative overflow-hidden`,
        {
          [`bg-indigo-500/50 text-white`]: pathname === to,
          [`text-indigo-500`]: pathname !== to,
        },
        className
      )}
    >
      {children}
    </Link>
  );
};

const TabItem = (props: ITab & { className?: string }) => {
  const [title, setTitle] = useState(props.title);
  const [favicon, setFavicon] = useState(props?.favicon || "");
  useEffect(() => {
    const titleChangedCB = ({ id, title }: { id: string; title: string }) => {
      props.id === id && setTitle(title);
    };
    const faviconChangedCB = ({ id, favicon }: { id: string; favicon: string }) => {
      console.log("function", favicon);
      props.id === id && setFavicon(favicon);
    };
    window.api.VIEW_TITLE_CHANGED(titleChangedCB);
    window.api.VIEW_FAVICON_CHANGED(faviconChangedCB);
  }, []);
  return (
    <NavItem to={`/${props.id}`} className={props.className}>
      <Avatar src={favicon} />
      <span className="text-[8px] text-center">{title.length > 7 ? title.substring(0, 7).padEnd(10, ".") : title}</span>
    </NavItem>
  );
};

export { SideMenu };
