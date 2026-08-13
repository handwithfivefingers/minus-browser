import { useCallback, useEffect, useRef, useState } from 'react'

import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'
import { IPC_TAB_GROUP_EMIT, IPC_TAB_GROUP_INVOKE } from '~/shared/constants/ipc/tabGroup'

import { register } from '../../registry'

import { ContextMenu } from './ContextMenu'
import { CreateGroup } from './CreateGroup'
import { ContextPayload, GROUP_COLORS, IGroup, View } from './types'

export function TabContext() {
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
            .catch(() => {
              console.log('Failed to fetch groups')
            })
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
      const group = groups.find((g) => g.id === groupId)
      if (group) {
        window.api.INVOKE(IPC_TAB_GROUP_INVOKE.OPEN_GROUP_TAB, groupId)
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

  const menuX = Math.min(position.x, window.innerWidth - 200)
  const menuY = Math.min(position.y, window.innerHeight - 360)
  const createX = Math.max(8, Math.min(position.x, window.innerWidth - 272))
  const createY = Math.max(8, Math.min(position.y, window.innerHeight - 260))

  if (view === 'context-menu') {
    return (
      <div className="fixed inset-0">
        <ContextMenu
          tabId={tabId}
          currentGroupId={currentGroupId}
          groups={groups}
          menuRef={menuRef}
          style={{ left: menuX, top: menuY, pointerEvents: 'auto' }}
          onAddToGroup={addToGroup}
          onRemoveFromGroup={removeFromGroup}
          onSwitchGroup={onSwitchGroup}
          onOpenGroup={openGroupTabs}
          onShowCreateGroup={() => {
            setView('create-group')
            setGroupColor(GROUP_COLORS[0])
          }}
          onForceReload={() => {
            window.api.INVOKE('FORCE_CLEAR_CACHE_HARD_RELOAD', { tabId })
            hide()
          }}
        />
      </div>
    )
  }

  return (
    <div className="fixed inset-0">
      <CreateGroup
        editGroup={editGroupData}
        groupName={groupName}
        groupColor={groupColor}
        menuRef={menuRef}
        inputRef={inputRef}
        style={{ left: createX, top: createY, pointerEvents: 'auto' }}
        onNameChange={setGroupName}
        onColorChange={setGroupColor}
        onSave={editGroupData ? saveEditGroup : createGroup}
        onCancel={() => setView('context-menu')}
      />
    </div>
  )
}

export const TabContextRegister = register({
  path: '/tab-context',
  name: 'Tab Context',
  component: TabContext,
  shell: false,
})
