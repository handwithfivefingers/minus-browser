import { useEffect, useRef, useState } from 'react'

import { cn } from '../../libs/cn'
import { useMinusThemeStore } from '../../stores/useMinusTheme'

interface ResizableSidebarProps {
  children: React.ReactNode
  className?: string
  initialWidth?: number
  minWidth?: number
  maxWidth?: number
}

const LAYOUT_SIDEBAR_CLASS = {
  BASIC:
    'flex-shrink-0 flex flex-col px-1 py-2 bg-slate-100 dark:bg-slate-900 gap-1.5 transition-all h-full border-r border-slate-300 dark:border-slate-700',
  FLOATING:
    'flex-shrink-0 flex flex-col px-1 py-2 bg-slate-100 dark:bg-slate-900 gap-1.5 transition-all rounded-lg h-full',
}

export const ResizableSidebar = ({
  children,
  className,
  initialWidth = 250,
  minWidth = 150,
  maxWidth = 600,
}: ResizableSidebarProps) => {
  const [width, setWidth] = useState(initialWidth)
  const [isDragging, setIsDragging] = useState(false)
  const sidebarRef = useRef(null)
  const { layout } = useMinusThemeStore()

  // Start resize when mousedown on the drag handle
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const startResizeTouch = (e: React.TouchEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  // Handle resize during mousemove / touchmove — clamp to [minWidth, maxWidth]
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isDragging) return
      const newWidth = e.clientX
      const clampedWidth = Math.min(maxWidth, Math.max(minWidth, newWidth))
      setWidth(clampedWidth)
    }

    const handleTouchResize = (e: TouchEvent) => {
      if (!isDragging) return
      const newWidth = e.touches[0]?.clientX ?? 0
      const clampedWidth = Math.min(maxWidth, Math.max(minWidth, newWidth))
      setWidth(clampedWidth)
    }

    const stopResize = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleResize)
      document.addEventListener('mouseup', stopResize)
      document.addEventListener('touchmove', handleTouchResize, { passive: false })
      document.addEventListener('touchend', stopResize)
      document.addEventListener('touchcancel', stopResize)
    }

    return () => {
      document.removeEventListener('mousemove', handleResize)
      document.removeEventListener('mouseup', stopResize)
      document.removeEventListener('touchmove', handleTouchResize)
      document.removeEventListener('touchend', stopResize)
      document.removeEventListener('touchcancel', stopResize)
    }
  }, [isDragging, minWidth, maxWidth])

  return (
    <div
      ref={sidebarRef}
      className={cn('sidebar-container ', LAYOUT_SIDEBAR_CLASS[layout as keyof typeof LAYOUT_SIDEBAR_CLASS], className)}
      style={{
        width: `${width}px`,
        position: 'relative',
        height: '100%',
        minHeight: 0,
        maxHeight: '100%',
        transition: isDragging ? 'none' : 'width 0.1s ease-out',
        overflow: 'hidden',
      }}
    >
      <div
        className="sidebar-content flex h-full flex-col gap-1 overflow-hidden"
        style={{ width: '100%', minHeight: 0, maxHeight: '100%' }}
      >
        {children}
      </div>

      {/* Resize handle */}
      <div
        className="resize-handle flex justify-center hover:bg-slate-500 dark:hover:bg-slate-400"
        onMouseDown={startResize}
        onTouchStart={startResizeTouch}
        tabIndex={-1}
        aria-hidden
        style={{
          position: 'absolute',
          right: '0',
          top: '0',
          bottom: '0',
          width: '8px',
          cursor: 'col-resize',
          backgroundColor: isDragging ? '#718096' : 'transparent',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '100%',
            backgroundColor: isDragging ? '#718096' : 'transparent',
          }}
          className="pointer-events-none"
        />
      </div>
    </div>
  )
}
