import { memo, useCallback } from "react";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { ITabGroup } from "~/shared/types/tab-group";
import { Tab } from "~/features/ui/interfaces/tab";
import { TabItem } from "../tab";
import { TabGroupHeader } from "./TabGroupHeader";
import { IPC_TAB_GROUP_INVOKE } from "~/shared/constants/ipc/tabGroup";
// @ts-ignore
import styles from "./styles.module.css";

const MAX_TABS_VISIBLE = 5;
const TAB_HEIGHT = 34;
const TAB_GAP = 2;
const TAB_LIST_PADDING = 4;
const MAX_TAB_LIST_HEIGHT = MAX_TABS_VISIBLE * TAB_HEIGHT + (MAX_TABS_VISIBLE - 1) * TAB_GAP + TAB_LIST_PADDING;

interface TabGroupContainerProps {
  group: ITabGroup;
  tabs: Tab[];
  onCloseTab: ({ id }: { id: string }) => void;
  onContextMenu: (e: React.MouseEvent, tabId: string) => void;
  onGroupContextMenu?: (e: React.MouseEvent, groupId: string) => void;
  getDragHandleProps: (
    tabId: string,
    index: number,
  ) => {
    onMouseDown: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
  };
}

const TabGroupContainer = memo(
  ({ group, tabs, onCloseTab, onContextMenu, onGroupContextMenu, getDragHandleProps }: TabGroupContainerProps) => {
    console.log("group", group);
    const toggleCollapse = useCallback(() => {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.TOGGLE_TAB_GROUP_COLLAPSE, group.id);
    }, [group.id]);

    return (
      <div
        className={styles.groupContainer}
        data-group-id={group.id}
        style={{
          backgroundColor: `color-mix(in srgb, ${group.color}, transparent 90%)`,
        }}
      >
        <TabGroupHeader group={group} tabCount={tabs.length} onContextMenu={onGroupContextMenu} />

        {!group.collapsed && (
          <div
            className={styles.tabList}
            style={{ maxHeight: tabs.length > MAX_TABS_VISIBLE ? MAX_TAB_LIST_HEIGHT : undefined }}
          >
            {tabs.length === 0 ? (
              <div className={styles.emptyState}>No tabs</div>
            ) : (
              tabs.map((tab, idx) => (
                <div key={tab.id} className="relative" data-dnd-id={tab.id} data-group-id={group.id}>
                  <TabItem
                    {...tab}
                    className="flex flex-col items-center"
                    onClose={onCloseTab}
                    onContextMenu={onContextMenu}
                    dragHandleProps={getDragHandleProps(tab.id, idx)}
                    groupColor={group.color}
                  />
                </div>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleCollapse();
          }}
          className={styles.collapseButton}
        >
          {!group.collapsed ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
        </button>

        <span
          className="mask-[linear-gradient(0deg,black,transparent)] left-0 right-0 bottom-0 h-12 absolute rounded-b-md"
          style={{
            backgroundColor: `color-mix(in srgb, ${group.color}, transparent 50%)`,
          }}
        />
      </div>
    );
  },
);

export { TabGroupContainer };
