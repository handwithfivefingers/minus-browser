import { IconBell, IconBellFilled } from '@tabler/icons-react'
import clsx from 'clsx'

import { useWebNotificationStore } from '~/shared/store/useNotificationStore'

export const NotificationBell = () => {
  const unreadCount = useWebNotificationStore((s) => s.unreadCount)
  return (
    <button
      type="button"
      onClick={() => window.api.EMIT('NOTIFICATION_TOGGLE_LIST')}
      className={clsx(
        ' relative z-1 flex w-full shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-md px-0.5 py-1 text-slate-500 transition-colors hover:bg-white hover:text-indigo-500 dark:text-slate-400 dark:hover:bg-slate-800'
      )}
      title="Notifications"
    >
      {unreadCount > 0 ? <IconBellFilled size={16} /> : <IconBell size={16} />}
      <span className="text-[10px] font-medium">Alerts</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-0.5 text-[8px] font-bold text-white">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  )
}
