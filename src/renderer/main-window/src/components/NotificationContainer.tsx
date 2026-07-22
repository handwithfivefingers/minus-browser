import { IconX } from '@tabler/icons-react'

import { useNotificationStore } from '../stores/useNotificationStore'

export const NotificationContainer = () => {
  const { notifications, remove } = useNotificationStore()

  if (notifications.length === 0) return null

  const styles: Record<string, string> = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`animate-in slide-in-from-right flex max-w-md min-w-[320px] items-center gap-3 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${styles[n.type] || styles.info}`}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{n.title}</p>
            {n.message && <p className="mt-0.5 text-xs opacity-90">{n.message}</p>}
          </div>
          {n.action && (
            <button
              type="button"
              onClick={n.action.onClick}
              className="shrink-0 cursor-pointer rounded bg-white/20 px-3 py-1 text-xs font-medium whitespace-nowrap hover:bg-white/30"
            >
              {n.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => remove(n.id)}
            className="shrink-0 cursor-pointer opacity-70 hover:opacity-100"
          >
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
