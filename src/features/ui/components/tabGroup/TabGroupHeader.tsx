import { IconTrash, IconPencil, IconEyeOff, IconEye } from "@tabler/icons-react";
import { memo, useCallback } from "react";
import { ITabGroup } from "~/shared/types/tab-group";
import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_EMIT } from "~/shared/constants/ipc/tabGroup";

interface TabGroupHeaderProps {
  group: ITabGroup;
  tabCount: number;
  onContextMenu?: (e: React.MouseEvent, groupId: string) => void;
}

const TabGroupHeader = memo(({ group, tabCount, onContextMenu }: TabGroupHeaderProps) => {
  const deleteGroup = useCallback(() => {
    window.api.INVOKE(IPC_TAB_GROUP_INVOKE.DELETE_TAB_GROUP, group.id);
  }, [group.id]);

  const editGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_GROUP_CONTEXT_MENU, {
      editGroup: { id: group.id, name: group.name, color: group.color },
      x: e.clientX || 100,
      y: e.clientY || 100,
    });
  }, [group]);

  const toggleHide = useCallback(() => {
    if (group.hidden) {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.UNHIDE_GROUP, group.id);
    } else {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.HIDE_GROUP, group.id);
    }
  }, [group.id, group.hidden]);

  return (
    <div
      className="flex items-center gap-1 px-1 rounded-md shrink-0 flex-col"
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e, group.id);
      }}
    >
      <div className="relative min-w-0 flex-1 group/name">
        <span
          className="block text-[10px] font-semibold text-indigo-600/80 uppercase tracking-wide truncate group-hover/name:invisible transition-none px-0.5"
        >
          {group.name}
        </span>
        <div className="absolute inset-0 flex items-center gap-0.5 opacity-0 group-hover/name:opacity-100 transition-opacity px-0.5">
          <button
            type="button"
            onClick={editGroup}
            className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-indigo-500 rounded shrink-0"
          >
            <IconPencil size={10} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); deleteGroup(); }}
            className="w-3.5 h-3.5 flex items-center justify-center text-slate-400 hover:text-red-500 rounded shrink-0"
          >
            <IconTrash size={10} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        {group.hidden && <IconEyeOff size={10} className="text-slate-300" />}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); toggleHide(); }}
          className="w-3.5 h-3.5 flex items-center justify-center text-indigo-500 hover:text-indigo-800 rounded shrink-0 cursor-pointer"
          title={group.hidden ? "Show group" : "Hide group from sidebar"}
        >
          {group.hidden ? <IconEye size={10} /> : <IconEyeOff size={10} />}
        </button>
        <span
          className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold"
          style={{ backgroundColor: `${group.color}20`, color: group.color }}
        >
          {tabCount}
        </span>
      </div>
    </div>
  );
});

export { TabGroupHeader };
