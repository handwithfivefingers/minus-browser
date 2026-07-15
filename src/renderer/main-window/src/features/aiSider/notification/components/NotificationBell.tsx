import { IconBell, IconBellFilled } from "@tabler/icons-react";
import clsx from "clsx";
import { useWebNotificationStore } from "../store";

export const NotificationBell = () => {
  const unreadCount = useWebNotificationStore((s) => s.unreadCount);

  return (
    <button
      type="button"
      onClick={() => window.api.EMIT("NOTIFICATION_TOGGLE_LIST")}
      className={clsx(
        " z-1 w-full px-0.5 relative rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-colors text-slate-500 hover:text-indigo-500 shrink-0 bg-slate-100 gap-1 flex-col py-1",
      )}
      title="Notifications"
    >
      {unreadCount > 0 ? <IconBellFilled size={16} /> : <IconBell size={16} />}
      <span className="text-[10px] font-medium">Alerts</span>
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-3.5 h-3.5 flex items-center justify-center px-0.5">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};
