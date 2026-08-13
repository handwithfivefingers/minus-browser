import { IconHome } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { Link, useLocation, useNavigate } from 'react-router'

import { IPC_TAB_GROUP_EMIT, IPC_TAB_GROUP_INVOKE, IPC_TAB_GROUP_RENDERER_EVENT } from '~/shared/constants/ipc/tabGroup'

import { Tab } from '../../interfaces/tab'
import { cn } from '../../libs/cn'
import { useTabGroupStore } from '../../stores/useTabGroupStore'
import { useTabStore } from '../../stores/useTabStore'
import { TabItem } from '../tab'
import { TabGroupContainer } from '../tabGroup'

import { ResizableSidebar } from './ResizableSidebar'
import { SubMenuItem } from './SubMenuItem'
/** @ts-ignore */
import styles from './styles.module.css'
import { useTabDrag } from './useTabDrag'

const SideMenu = () => {
  const navigate = useNavigate()
  const pathname = useLocation().pathname
  const tabs = useTabStore((s) => s.tabs)

  const groups = useTabGroupStore((s) => s.groups)
  const setGroups = useTabGroupStore((s) => s.setGroups)

  const pinnedTabs = useMemo(() => tabs.filter((t) => t.isPinned), [tabs])
  const unpinnedTabs = useMemo(() => tabs.filter((t) => !t.isPinned), [tabs])
  const visibleGroups = useMemo(() => groups.filter((g) => !g.hidden), [groups])
  const groupedTabIds = useMemo(() => new Set(groups.flatMap((g) => g.tabIds)), [groups])
  const ungroupedTabs = useMemo(
    () => unpinnedTabs.filter((t) => !groupedTabIds.has(t.id)),
    [unpinnedTabs, groupedTabIds]
  )
  const groupedTabsByGroup = useMemo(() => {
    const map = new Map<string, Tab[]>()
    for (const group of groups) {
      const groupTabs: Tab[] = []
      for (const tabId of group.tabIds) {
        const tab = unpinnedTabs.find((t) => t.id === tabId)
        if (tab) groupTabs.push(tab)
      }
      map.set(group.id, groupTabs)
    }
    return map
  }, [groups, unpinnedTabs])

  const { draggedTabId, dropIndicator, getDragHandleProps } = useTabDrag(tabs)

  const onAddNewTab = async (payload: Partial<Tab>) => {
    const tab = await window.api.INVOKE<Tab>('CREATE_TAB', payload)
    setTimeout(() => {
      tab.id && navigate(tab.id)
    }, 500)
  }

  useEffect(() => {
    ;(async () => {
      const groups = await window.api.INVOKE(IPC_TAB_GROUP_INVOKE.GET_TAB_GROUPS)
      if (groups) setGroups(groups as any)
    })()
    window.api.LISTENER('CREATE_TAB', (p) => {
      onAddNewTab(p as Partial<Tab>)
    })
    window.api.LISTENER(IPC_TAB_GROUP_RENDERER_EVENT.TAB_GROUP_UPDATED, (data) => {
      setGroups(data as any)
    })
  }, [])

  const onCloseTab = async ({ id }: { id: string }) => {
    const currentTabs = useTabStore.getState().tabs
    const closedIndex = currentTabs.findIndex((t) => t.id === id)
    const isActiveTab = pathname === `/${id}`

    window.api.EMIT('ON_CLOSE_TAB', { id })

    if (isActiveTab) {
      if (currentTabs.length <= 1) {
        navigate(`/`)
      } else if (closedIndex > 0) {
        navigate(`/${currentTabs[closedIndex - 1].id}`)
      } else {
        navigate(`/${currentTabs[1].id}`)
      }
    }
  }

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.preventDefault()
      const tab = tabs.find((t) => t.id === tabId)
      const group = groups.find((g) => g.tabIds.includes(tabId))
      window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
        tabId,
        currentGroupId: group?.id || tab?.groupId,
        x: e.clientX,
        y: e.clientY,
      })
    },
    [tabs, groups]
  )

  const handleGroupContextMenu = useCallback((e: React.MouseEvent, groupId: string) => {
    e.preventDefault()
    window.api.EMIT(IPC_TAB_GROUP_EMIT.SHOW_TAB_CONTEXT_MENU, {
      groupId,
      x: e.clientX,
      y: e.clientY,
    })
  }, [])

  return (
    <ErrorBoundary FallbackComponent={(fallbackProps) => <ComponentError {...fallbackProps} />}>
      <ResizableSidebar initialWidth={56} minWidth={30} maxWidth={350} className={cn(styles.sidebar)}>
        <div className="flex h-full flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto" style={{}}>
          <Link
            to={'/'}
            viewTransition
            className={cn(
              `relative flex h-8 shrink-0 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-md px-0.5  text-slate-800 transition-all hover:text-indigo-500 dark:text-slate-200`,
              {
                [`bg-white text-slate-500 shadow-md dark:bg-slate-700 dark:text-slate-300`]: pathname === '/',
                [`text-slate-500 dark:text-slate-400`]: pathname !== '/',
              }
            )}
          >
            <IconHome size={16} />
          </Link>

          {/* Pinned tabs section */}
          {pinnedTabs.length > 0 && (
            <div className={styles.pinnedGroup}>
              <span className={styles.pinnedLabel}>Pinned</span>
              {pinnedTabs.map((tab) => (
                <TabItem
                  {...tab}
                  key={tab.id}
                  className={cn('flex flex-col items-center', styles.tabItem, styles.pinnedTab)}
                  onClose={onCloseTab}
                />
              ))}
            </div>
          )}

          <div
            className="flex h-full flex-col gap-0.5 overflow-y-auto"
            style={{
              scrollbarWidth: 'none',
              scrollbarColor: 'rgba(99, 102, 241, 0.2) transparent',
            }}
          >
            {/* Tab groups section */}
            {visibleGroups.map((group) => {
              const groupTabs = groupedTabsByGroup.get(group.id) || []
              return (
                <TabGroupContainer
                  data-group-id={group.id}
                  key={group.id}
                  group={group}
                  tabs={groupTabs}
                  onCloseTab={onCloseTab}
                  onContextMenu={handleContextMenu}
                  onGroupContextMenu={handleGroupContextMenu}
                  getDragHandleProps={(tabId, idx) => getDragHandleProps(tabId, idx, group.id)}
                />
              )
            })}

            {/* Ungrouped tabs section */}
            {ungroupedTabs.length > 0 && groups.length > 0 && (
              <span className={styles.pinnedLabel} style={{ marginTop: 4 }}>
                Other tabs
              </span>
            )}
            <div className={styles.unpinnedGroup}>
              {ungroupedTabs.map((tab, idx) => {
                const handleProps = getDragHandleProps(tab.id, idx)
                return (
                  <div key={tab.id} className={styles.dndItemWrapper} data-dnd-id={tab.id}>
                    {dropIndicator?.tabId === tab.id && dropIndicator?.position === 'before' && (
                      <div className={styles.dropLine} />
                    )}
                    <TabItem
                      {...tab}
                      className={cn('flex flex-col items-center', styles.tabItem, {
                        [styles.dragOverTop]: dropIndicator?.tabId === tab.id && dropIndicator?.position === 'before',
                        [styles.dragOverBottom]: dropIndicator?.tabId === tab.id && dropIndicator?.position === 'after',
                      })}
                      onClose={onCloseTab}
                      onContextMenu={handleContextMenu}
                      isDragging={draggedTabId === tab.id}
                      dragHandleProps={handleProps}
                    />
                    {dropIndicator?.tabId === tab.id && dropIndicator?.position === 'after' && (
                      <div className={styles.dropLine} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <SubMenuItem tabs={tabs} onAddNewTab={onAddNewTab} />
      </ResizableSidebar>
    </ErrorBoundary>
  )
}

const ComponentError = ({ error }: FallbackProps) => {
  console.error('Stack', (error as Error)?.stack)
  console.error('Name', (error as Error)?.name)
  return <div>Error: {(error as Error)?.message}</div>
}
export { SideMenu }
