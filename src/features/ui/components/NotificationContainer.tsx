import { IconX } from "@tabler/icons-react";
import { useNotificationStore } from "../stores/useNotificationStore";

export const NotificationContainer = () => {
  const { notifications, remove } = useNotificationStore();

  if (notifications.length === 0) return null;

  const styles: Record<string, string> = {
    success: "bg-green-600",
    error: "bg-red-600",
    info: "bg-blue-600",
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {notifications.map((n) => (
        <div
          key={n.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-white text-sm min-w-[320px] max-w-md animate-in slide-in-from-right ${styles[n.type] || styles.info}`}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{n.title}</p>
            {n.message && <p className="opacity-90 text-xs mt-0.5">{n.message}</p>}
          </div>
          {n.action && (
            <button
              type="button"
              onClick={n.action.onClick}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-medium cursor-pointer whitespace-nowrap shrink-0"
            >
              {n.action.label}
            </button>
          )}
          <button type="button" onClick={() => remove(n.id)} className="opacity-70 hover:opacity-100 cursor-pointer shrink-0">
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
