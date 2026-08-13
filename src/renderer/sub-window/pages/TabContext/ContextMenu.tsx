import { RefObject } from 'react'

import { IGroup } from './types'

interface ContextMenuProps {
  tabId: string | null
  currentGroupId: string | null
  groups: IGroup[]
  menuRef: RefObject<HTMLDivElement | null>
  style: React.CSSProperties
  onAddToGroup: (groupId: string) => void
  onRemoveFromGroup: () => void
  onSwitchGroup: (groupId: string) => void
  onOpenGroup: (groupId: string) => void
  onShowCreateGroup: () => void
  onForceReload: () => void
}

export const ContextMenu = ({
  tabId,
  currentGroupId,
  groups,
  menuRef,
  style,
  onAddToGroup,
  onRemoveFromGroup,
  onSwitchGroup,
  onOpenGroup,
  onShowCreateGroup,
  onForceReload,
}: ContextMenuProps) => {
  const renderGroupRow = (group: IGroup, onClick: () => void) => (
    <button
      type="button"
      key={group.id}
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
    >
      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
      <span className="truncate">{group.name}</span>
    </button>
  )

  return (
    <div
      ref={menuRef}
      className="fixed min-w-44 rounded-lg border border-slate-200 bg-white pt-1 shadow-xl dark:border-slate-700 dark:bg-slate-800"
      style={style}
    >
      {tabId && !currentGroupId ? (
        <>
          <button
            type="button"
            onClick={onForceReload}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-orange-50 hover:text-orange-600 dark:text-slate-300 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Force Reload"
            >
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            Force Clear Cache & Hard Reload
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Add to group
          </div>

          {groups.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 italic dark:text-slate-500">No groups yet</div>
          )}

          {groups.map((group) => renderGroupRow(group, () => onAddToGroup(group.id)))}

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

          <button
            type="button"
            onClick={onShowCreateGroup}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-indigo-500"
              aria-label="Add"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New group
          </button>
        </>
      ) : tabId && currentGroupId ? (
        <>
          <button
            type="button"
            onClick={onRemoveFromGroup}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:text-slate-300 dark:hover:bg-indigo-900/20 dark:hover:text-indigo-400"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-label="Remove"
            >
              <path d="M9 13h6" />
              <path d="M4 6h16" />
              <path d="M6 6v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
            </svg>
            Remove from group
          </button>

          <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

          <div className="flex flex-col">
            <span className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-400 dark:text-slate-500">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="Switch"
              >
                <polyline points="15 3 21 3 21 9" />
                <line x1="9" y1="15" x2="21" y2="3" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="15" y1="9" x2="3" y2="21" />
              </svg>
              Switch to Group
            </span>
            <div className="mt-1 border-t border-slate-200 dark:border-slate-700" />
            <div className="rounded-b-md py-2">
              {groups
                ?.filter((item) => item.id !== currentGroupId)
                ?.map((group) => renderGroupRow(group, () => onSwitchGroup(group.id)))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase dark:text-slate-500">
            Open Group
          </div>

          {groups.length === 0 && (
            <div className="px-3 py-2 text-xs text-slate-400 italic dark:text-slate-500">No groups yet</div>
          )}

          {groups.map((group) => renderGroupRow(group, () => onOpenGroup(group.id)))}
        </>
      )}
    </div>
  )
}
