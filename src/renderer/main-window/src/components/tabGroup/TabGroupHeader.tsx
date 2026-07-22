import { IconTrash, IconPencil, IconEyeOff, IconEye } from '@tabler/icons-react'
import { memo, useCallback } from 'react'

import { IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_EMIT } from '~/shared/constants/ipc/tabGroup'
import { ITabGroup } from '~/shared/types/tab-group'

interface TabGroupHeaderProps {
  group: ITabGroup
  tabCount: number
  onContextMenu?: (e: React.MouseEvent, groupId: string) => void
}

const TabGroupHeader = memo(({ group, tabCount, onContextMenu }: TabGroupHeaderProps) => {
  const deleteGroup = useCallback(() => {
    window.api.INVOKE(IPC_TAB_GROUP_INVOKE.DELETE_TAB_GROUP, group.id)
  }, [group.id])

  const editGroup = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
        editGroup: { id: group.id, name: group.name, color: group.color },
        x: e.clientX || 100,
        y: e.clientY || 100,
      })
    },
    [group]
  )

  const toggleHide = useCallback(() => {
    if (group.hidden) {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.UNHIDE_GROUP, group.id)
    } else {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.HIDE_GROUP, group.id)
    }
  }, [group.id, group.hidden])

  return (
    <div
      className="z-2 flex shrink-0 flex-col items-center gap-1 rounded-md px-1"
      onContextMenu={(e) => {
        e.preventDefault()
        onContextMenu?.(e, group.id)
      }}
    >
      <div className="group/name relative min-w-0 flex-1">
        <span className="block truncate px-0.5 text-[10px] font-semibold tracking-wide text-indigo-600/80 uppercase transition-none group-hover/name:invisible">
          {group.name}
        </span>
        <div className="absolute inset-0 flex items-center  justify-center gap-0.5 px-0.5 opacity-0 transition-opacity group-hover/name:opacity-100">
          <button
            type="button"
            onClick={editGroup}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-800"
          >
            <IconPencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              deleteGroup()
            }}
            className="flex shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-red-500"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-0.5">
        {group.hidden && <IconEyeOff size={16} className="text-slate-300" />}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleHide()
          }}
          className="flex h-3.5 w-3.5 shrink-0 cursor-pointer items-center justify-center rounded text-indigo-500 hover:text-indigo-800"
          title={group.hidden ? 'Show group' : 'Hide group from sidebar'}
        >
          {group.hidden ? <IconEye size={16} /> : <IconEyeOff size={16} />}
        </button>
        {/* <span
          className="inline-flex items-center justify-center min-w-[18px] h-[16px] px-1 rounded-full text-[9px] font-bold"
          style={{ backgroundColor: `${group.color}20`, color: group.color }}
        >
          {tabCount}
        </span> */}
      </div>
    </div>
  )
})
TabGroupHeader.displayName = 'TabGroupHeader'

export { TabGroupHeader }
