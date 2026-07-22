import {
  IconBellOff,
  IconError404,
  IconPin,
  IconPinFilled,
  IconScreenShare,
  IconVolume,
  IconVolumeOff,
  IconX,
} from '@tabler/icons-react'
import { memo, useCallback } from 'react'
import { ErrorBoundary, FallbackProps } from 'react-error-boundary'
import { Link, useLocation } from 'react-router'

import { ITab } from '~/shared/types'

import { cn } from '../../libs/cn'
import { useTabStore } from '../../stores/useTabStore'
import { Avatar } from '../avatar'

/** @ts-ignore */
import styles from './styles.module.css'

interface ITabItem extends Omit<ITab, 'updateTitle' | 'updateUrl' | 'onFocus' | 'onBlur' | 'id'> {
  id: string
  className?: string
  onClose: ({ id }: { id: string }) => void
  onContextMenu?: (e: React.MouseEvent, tabId: string) => void
  isDragging?: boolean
  dragHandleProps?: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
  groupColor?: string
}

const TabItem = memo(
  ({ id, className, onClose, onContextMenu, isDragging, dragHandleProps, groupColor, ...props }: ITabItem) => {
    const location = useLocation()
    const setActiveTab = useTabStore((s) => s.setActiveTab)
    const tab = useTabStore((s) => s.tabs.find((item) => item.id === id))
    const onTogglePin = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        window.api.INVOKE('TOGGLE_PIN_TAB', { id })
      },
      [id]
    )

    const handleMuteToggle = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        window.api.EMIT('TOGGLE_MUTE_TAB', { tabId: id })
      },
      [id]
    )

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, id)
      },
      [id, onContextMenu]
    )

    return (
      <ErrorBoundary FallbackComponent={ComponentError}>
        <div
          className={cn(styles.tabItem, 'group flex overflow-hidden rounded-md', { [styles.dragging]: isDragging })}
          // style={groupColor ? { borderLeft: `3px solid ${groupColor}` } : undefined}
          onContextMenu={handleContextMenu}
          {...dragHandleProps}
        >
          <Link
            to={`/${id}`}
            viewTransition
            className={cn(
              `relative z-0 flex h-10  w-full cursor-pointer flex-row items-center justify-start gap-1 overflow-hidden p-1 transition-colors hover:bg-white hover:text-indigo-500 dark:hover:bg-slate-800`,
              {
                [`bg-white text-indigo-500 shadow-md dark:bg-slate-700 dark:text-indigo-300`]:
                  location.pathname == `/${id}`,
                [`text-indigo-500 dark:text-indigo-400`]: location.pathname !== `/${id}`,
              },
              className
            )}
            title={tab?.title}
            onClick={() => setActiveTab(id)}
          >
            <div className="relative flex">
              <Avatar src={tab?.favicon} />

              {tab?.audible && !tab?.isMuted && (
                <button
                  className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0"
                  onClick={handleMuteToggle}
                  title="Mute tab"
                  type="button"
                >
                  <IconVolume className="text-slate-700 dark:text-slate-300" size={12} />
                </button>
              )}

              {tab?.isMuted && (
                <button
                  className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-none bg-transparent p-0"
                  onClick={handleMuteToggle}
                  title="Unmute tab"
                  type="button"
                >
                  <IconVolumeOff className="text-slate-700 dark:text-slate-300" size={12} />
                </button>
              )}

              {/* {tab?.isUsingCamera && (
              <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5" title="Camera in use">
                <span className="w-1 h-1 rounded-full bg-red-500" />
                <IconVideo className="text-red-500" size={10} />
              </div>
            )} */}

              {(tab?.isUsingCamera || tab?.isUsingMicrophone) && (
                <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2" title="Recording">
                  <div className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-300" />
                </div>
              )}

              {tab?.isUsingScreenShare && (
                <div className="absolute right-0 bottom-0 translate-x-1/2 translate-y-1/2" title="Screen sharing">
                  <IconScreenShare className="text-green-500" size={10} />
                </div>
              )}

              {(tab?.blockedNotifications ?? 0) > 0 && (
                <div
                  className="absolute -right-1.5 -bottom-1.5 flex items-center gap-0.5"
                  title={`${tab?.blockedNotifications} notification${tab?.blockedNotifications !== 1 ? 's' : ''} blocked`}
                >
                  <IconBellOff className="text-orange-500" size={10} />
                  {(tab?.blockedNotifications ?? 0) > 1 && (
                    <span className="text-[8px] leading-none font-bold text-orange-500">
                      {tab?.blockedNotifications}
                    </span>
                  )}
                </div>
              )}
            </div>

            <span className={styles.title}>{typeof tab?.title === 'string' ? tab?.title : 'New Tab'}</span>
          </Link>

          <div
            className={cn(
              styles.actionsOverlay,
              'right-0 hidden flex-col border-l border-slate-200 group-hover:flex dark:border-slate-700',
              {}
            )}
          >
            <button
              className={styles.actionButton}
              onClick={onTogglePin}
              title={tab?.isPinned ? 'Unpin tab' : 'Pin tab'}
            >
              {tab?.isPinned ? <IconPinFilled size={14} /> : <IconPin size={14} />}
            </button>
            <IconX className={cn(styles.actionButton, styles.closeBtn)} onClick={() => onClose({ id })} size={14} />
          </div>
        </div>
      </ErrorBoundary>
    )
  }
)
TabItem.displayName = 'TabItem'
const ComponentError = ({ error }: FallbackProps) => {
  console.error('Stack', (error as Error)?.stack)
  console.error('Name', (error as Error)?.name)
  return (
    <div>
      <IconError404 />
    </div>
  )
}
export { TabItem }
