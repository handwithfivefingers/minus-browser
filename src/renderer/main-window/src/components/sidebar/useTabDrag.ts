import { useCallback, useEffect, useRef, useState } from 'react'

import { IPC_TAB_GROUP_INVOKE } from '~/shared/constants/ipc/tabGroup'

import { Tab } from '../../interfaces/tab'

type DragState = {
  id: string
  index: number
  startY: number
  groupId?: string
}

type DropTarget = {
  tabId: string
  position: 'before' | 'after'
  groupId?: string
}

export const useTabDrag = (tabs: Tab[]) => {
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropTarget | null>(null)
  const dropTargetRef = useRef<DropTarget | null>(null)
  const dragState = useRef<DragState | null>(null)
  const active = useRef(false)

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
      const ds = dragState.current
      if (!ds) return

      if (!active.current && Math.abs(clientY - ds.startY) > 5) {
        active.current = true
        setDraggedTabId(ds.id)
      }
      if (!active.current) return

      const el = document.elementFromPoint('touches' in e ? e.touches[0].clientX : e.clientX, clientY)
      const wrapper = el?.closest<HTMLElement>('[data-dnd-id]')
      const groupHeader = el?.closest<HTMLElement>('[data-group-id]')
      if (wrapper) {
        const targetId = wrapper.dataset.dndId
        const targetGroupId = wrapper.dataset.groupId || ds.groupId
        if (targetId && targetId !== ds.id) {
          const rect = wrapper.getBoundingClientRect()
          const relY = clientY - rect.top
          const position: 'before' | 'after' = relY < rect.height / 2 ? 'before' : 'after'
          const next = { tabId: targetId, position, groupId: targetGroupId }
          dropTargetRef.current = next
          setDropIndicator(next)
        } else {
          dropTargetRef.current = null
          setDropIndicator(null)
        }
      } else if (groupHeader && ds.groupId && groupHeader.dataset.groupId !== ds.groupId) {
        // Dragging a tab onto a different group header -> move to that group
        const next = { tabId: ds.id, position: 'after' as const, groupId: groupHeader.dataset.groupId }
        dropTargetRef.current = next
        setDropIndicator(next)
      } else {
        dropTargetRef.current = null
        setDropIndicator(null)
      }
    }

    const handleUp = () => {
      const ds = dragState.current
      const dt = dropTargetRef.current
      if (active.current && ds) {
        if (dt && dt.tabId !== ds.id) {
          const currentUnpinned = tabs.filter((t) => !t.isPinned)
          const currentPinned = tabs.filter((t) => t.isPinned)

          // Cross-group move
          if (dt.groupId && ds.groupId !== dt.groupId) {
            window.api.INVOKE(IPC_TAB_GROUP_INVOKE.ADD_TAB_TO_GROUP, { groupId: dt.groupId, tabId: ds.id })
          }

          // Remove from previous group if it was in one
          if (ds.groupId && (!dt || dt.groupId !== ds.groupId)) {
            window.api.INVOKE(IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP, { groupId: ds.groupId, tabId: ds.id })
          }

          // Reorder within the same context (grouped or ungrouped)
          const draggedIdx = currentUnpinned.findIndex((t) => t.id === ds.id)
          const targetIdx = currentUnpinned.findIndex((t) => t.id === dt.tabId)
          if (draggedIdx !== -1 && targetIdx !== -1) {
            const newUnpinned = [...currentUnpinned]
            const [removed] = newUnpinned.splice(draggedIdx, 1)
            newUnpinned.splice(targetIdx, 0, removed)
            const orderedIds = [...currentPinned.map((t) => t.id), ...newUnpinned.map((t) => t.id)]
            window.api.EMIT('REORDER_TABS', { orderedIds })
          }
        } else if (!dt && ds.groupId) {
          // Dragged outside any group -> remove from group
          window.api.INVOKE(IPC_TAB_GROUP_INVOKE.REMOVE_TAB_FROM_GROUP, { groupId: ds.groupId, tabId: ds.id })
        }
      }
      active.current = false
      dragState.current = null
      dropTargetRef.current = null
      setDraggedTabId(null)
      setDropIndicator(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    document.addEventListener('touchmove', handleMove, { passive: true })
    document.addEventListener('touchend', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleUp)
    }
  }, [tabs])

  const getDragHandleProps = useCallback(
    (tabId: string, index: number, groupId?: string) => ({
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault()
        dragState.current = { id: tabId, index, startY: e.clientY, groupId }
      },
      onTouchStart: (e: React.TouchEvent) => {
        dragState.current = { id: tabId, index, startY: e.touches[0].clientY, groupId }
      },
    }),
    []
  )

  return { draggedTabId, dropIndicator, getDragHandleProps }
}
