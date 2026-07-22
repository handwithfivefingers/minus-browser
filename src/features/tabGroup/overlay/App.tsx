import { useCallback, useEffect, useRef, useState } from 'react'

import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { IPC_TAB_GROUP_INVOKE } from '~/shared/constants/ipc/tabGroup'

const GROUP_COLORS = ['#6366f1', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4']

interface IGroup {
  id: string
  name: string
  color: string
  tabIds: string[]
}

type View = 'context-menu' | 'create-group' | null

interface ContextPayload {
  tabId?: string
  groupId?: string
  currentGroupId?: string | null
  groups?: IGroup[]
  x: number
  y: number
  editGroup?: { id: string; name: string; color: string }
}

export function App() {
  const [view, setView] = useState<View>(null)
  const [tabId, setTabId] = useState<string | null>(null)
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null)
  const [contextGroupId, setContextGroupId] = useState<string | null>(null)
  const [editGroupData, setEditGroupData] = useState<{ id: string; name: string; color: string } | null>(null)
  const [groups, setGroups] = useState<IGroup[]>([])
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [groupName, setGroupName] = useState('')
  const [groupColor, setGroupColor] = useState(GROUP_COLORS[0])
  const menuRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const hide = useCallback(() => {
    setView(null)
    setTabId(null)
    setCurrentGroupId(null)
    setContextGroupId(null)
    setEditGroupData(null)
    setGroupName('')
    setGroupColor(GROUP_COLORS[0])
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }, [])

  useEffect(() => {
    const stored = sessionStorage.getItem('subWindowPayload')
    if (stored) {
      try {
        const payload: ContextPayload = JSON.parse(stored)
        sessionStorage.removeItem('subWindowPayload')
        if (payload.editGroup) {
          setEditGroupData(payload.editGroup)
          setGroupName(payload.editGroup.name)
          setGroupColor(payload.editGroup.color)
          setPosition({ x: payload.x, y: payload.y })
          setView('create-group')
          return
        }
        setTabId(payload.tabId || null)
        setCurrentGroupId(payload.currentGroupId || null)
        setContextGroupId(payload.groupId || null)
        setPosition({ x: payload.x, y: payload.y })
        if (payload.groups && payload.groups.length > 0) {
          setGroups(payload.groups)
        } else {
          Promise.resolve(window.api.INVOKE<IGroup[]>(IPC_TAB_GROUP_INVOKE.GET_TAB_GROUPS))
            .then((fetched) => {
              setGroups(fetched || [])
            })
            .catch(() => {})
        }
        setView('context-menu')
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  useEffect(() => {
    if (view === 'create-group') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [view])

  useEffect(() => {
    if (!view) return
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hide()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide()
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [view, hide])

  const addToGroup = useCallback(
    (groupId: string) => {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.ADD_TAB_TO_GROUP, { groupId, tabId })
      hide()
    },
    [tabId, hide]
  )

  const removeFromGroup = useCallback(() => {
    if (currentGroupId) {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP, { groupId: currentGroupId, tabId })
    }
    hide()
  }, [currentGroupId, tabId, hide])

  const createGroup = useCallback(() => {
    if (!groupName.trim()) return
    window.api.INVOKE(IPC_TAB_GROUP_INVOKE.CREATE_TAB_GROUP, {
      name: groupName.trim(),
      color: groupColor,
      tabIds: tabId ? [tabId] : [],
    })
    hide()
  }, [groupName, groupColor, tabId, hide])

  const saveEditGroup = useCallback(() => {
    if (!groupName.trim() || !editGroupData) return
    window.api.INVOKE(IPC_TAB_GROUP_INVOKE.RENAME_TAB_GROUP, { id: editGroupData.id, name: groupName.trim() })
    if (groupColor !== editGroupData.color) {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.SET_TAB_GROUP_COLOR, { id: editGroupData.id, color: groupColor })
    }
    hide()
  }, [groupName, groupColor, editGroupData, hide])

  const deleteGroup = useCallback(() => {
    if (contextGroupId) {
      window.api.INVOKE(IPC_TAB_GROUP_INVOKE.DELETE_TAB_GROUP, contextGroupId)
    }
    hide()
  }, [contextGroupId, hide])

  const closeGroup = useCallback(() => {
    if (!contextGroupId) return
    const group = groups.find((g) => g.id === contextGroupId)
    if (group) {
      for (const tid of group.tabIds) {
        window.api.EMIT('ON_CLOSE_TAB', { id: tid })
      }
    }
    hide()
  }, [contextGroupId, groups, hide])

  const openGroupTabs = useCallback(
    (groupId: string) => {
      // if (!contextGroupId) return;
      const group = groups.find((g) => g.id === groupId)
      if (group) {
        window.api.INVOKE(IPC_TAB_GROUP_INVOKE.OPEN_GROUP_TAB, groupId)
        // for (const tid of group.tabIds) {
        // }
      }
      hide()
    },
    [groups, hide]
  )
  const onSwitchGroup = (targetGroupId: string) => {
    removeFromGroup()
    addToGroup(targetGroupId)
  }

  if (!view) return null
  const isGroupContext = !!contextGroupId && tabId

  const menuX = Math.min(position.x, window.innerWidth - 200)
  const menuY = Math.min(position.y, window.innerHeight - 360)
  const createX = Math.max(8, Math.min(position.x, window.innerWidth - 272))
  const createY = Math.max(8, Math.min(position.y, window.innerHeight - 260))
  // alert([`currentGroupId`, currentGroupId, `tabId`, tabId].join(", "));
  if (view === 'context-menu') {
    return (
      <div className="fixed inset-0">
        <div
          ref={menuRef}
          className="fixed min-w-44 rounded-lg border border-slate-200 bg-white pt-1 shadow-xl"
          style={{ left: menuX, top: menuY, pointerEvents: 'auto' }}
        >
          {tabId && !currentGroupId ? (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Add to group
              </div>

              {groups.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">No groups yet</div>}

              {groups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => addToGroup(group.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="truncate">{group.name}</span>
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setView('create-group')
                  setGroupColor(GROUP_COLORS[0])
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
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
                onClick={removeFromGroup}
                className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
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

              <div className="flex flex-col">
                <span className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs  text-slate-400">
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
                <div className="mt-1 border-t border-slate-200" />
                <div className="rounded-b-md py-2">
                  {groups
                    ?.filter((item) => item.id !== currentGroupId)
                    ?.map((group) => (
                      <button
                        type="button"
                        key={group.id}
                        onClick={() => onSwitchGroup(group.id)}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                        <span className="truncate">{group.name}</span>
                      </button>
                    ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                Open Group
              </div>

              {groups.length === 0 && <div className="px-3 py-2 text-xs text-slate-400 italic">No groups yet</div>}

              {groups.map((group) => (
                <button
                  type="button"
                  key={group.id}
                  onClick={() => openGroupTabs(group.id)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: group.color }} />
                  <span className="truncate">{group.name}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0">
      <div
        ref={menuRef}
        className="fixed flex w-64 flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xl"
        style={{ left: createX, top: createY, pointerEvents: 'auto' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">{editGroupData ? 'Edit Group' : 'New Group'}</span>
          <button
            type="button"
            onClick={() => setView('context-menu')}
            className="p-0.5 text-slate-400 hover:text-slate-600"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-label="Back"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <input
          ref={inputRef}
          className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-400"
          placeholder="Group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (editGroupData) saveEditGroup()
              else createGroup()
            }
          }}
        />

        <div className="flex flex-wrap gap-1.5">
          {GROUP_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setGroupColor(c)}
              className={`h-5 w-5 rounded-full border-2 transition-all ${groupColor === c ? 'scale-110 border-slate-700' : 'border-transparent'}`}
              style={{ backgroundColor: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={editGroupData ? saveEditGroup : createGroup}
          disabled={!groupName.trim()}
          className="flex w-full items-center justify-center gap-1 rounded bg-indigo-500 py-1.5 text-sm text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {editGroupData ? 'Save' : 'Create'}
        </button>
      </div>
    </div>
  )
}
