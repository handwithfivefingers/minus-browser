import { IconBell, IconClock, IconDatabase, IconDeviceFloppy, IconLayoutGrid, IconMoon, IconRefresh, IconSun, IconTrash } from "@tabler/icons-react";
import clsx from "clsx";
import { useTheme } from "~/renderer/main-window/src/context/theme";
import { useMinusThemeStore } from "~/renderer/main-window/src/stores/useMinusTheme";
import { useUpdateStore } from "~/renderer/main-window/src/stores/useUpdateStore";
import { useNotificationStore } from "~/renderer/main-window/src/stores/useNotificationStore";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
enum LayoutTemplate {
  BASIC = "BASIC",
  FLOATING = "FLOATING",
}
interface ISystemForm {
  intervalTime: string;
  hardwareAcceleration: string;
  layout: "FLOATING" | "BASIC";
  savedCookies: "0" | "1";
  extension: {
    adblock: boolean;
  };
}

const MODE_OPTIONS: { value: "light" | "dark" | "auto"; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "Light", icon: IconSun },
  { value: "dark", label: "Dark", icon: IconMoon },
  { value: "auto", label: "Auto", icon: IconSun },
];

export const Interface = () => {
  const { layout, dataSync, savedCookies, historyRetentionDays, autoDownload, notificationRetentionDays, setDataSyncTime, setCookieMode, setLayout, setHistoryRetentionDays, setAutoDownload, setNotificationRetentionDays, saved } = useMinusThemeStore();
  const { mode, setMode } = useTheme();
  const { status, checkForUpdate } = useUpdateStore();
  const { notify } = useNotificationStore();
  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconSun size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600 dark:text-slate-400">Mode</span>
          <div className="grid grid-cols-3 gap-2 max-w-sm">
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={clsx(
                    "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                    mode === opt.value
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
                  )}
                  onClick={() => setMode(opt.value)}
                >
                  <Icon size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconDatabase size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">System Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Sync Data Interval</span>
            <select
              value={dataSync.intervalTime}
              onChange={(event) => setDataSyncTime(event.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
            >
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
              <option value="45">45 sec</option>
              <option value="60">60 sec</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Cookie saved as</span>
            <select
              value={savedCookies}
              onChange={(event) => setCookieMode(event.target.value as "0" | "1")}
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
            >
              <option value="0">System</option>
              <option value="1">File</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Layout Template</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                type="button"
                className={clsx(
                  "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                    layout === LayoutTemplate.BASIC
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
                )}
                onClick={() => setLayout(LayoutTemplate.BASIC)}
              >
                <IconLayoutGrid size={16} />
                BASIC
              </button>
              <button
                type="button"
                className={clsx(
                  "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                    layout === LayoutTemplate.FLOATING
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                      : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600",
                )}
                onClick={() => setLayout(LayoutTemplate.FLOATING)}
              >
                <IconLayoutGrid size={16} />
                FLOATING
              </button>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconClock size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">History</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Auto-delete history after (days)</span>
            <input
              type="number"
              min="1"
              max="365"
              value={historyRetentionDays || "30"}
              onChange={(e) => setHistoryRetentionDays(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">Entries older than this many days are automatically removed. Set to 0 to keep forever.</span>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconBell size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notifications</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Auto-clear notifications after (days)</span>
            <input
              type="number"
              min="1"
              max="365"
              value={notificationRetentionDays || "30"}
              onChange={(e) => setNotificationRetentionDays(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">Notifications older than this many days are automatically removed. Set to 0 to keep forever.</span>
          </label>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconRefresh size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Updates</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-slate-600 dark:text-slate-400">Auto-download updates</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">Download and prepare updates in the background</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={autoDownload ?? true}
                onChange={(e) => setAutoDownload(e.target.checked)}
              />
              <div className="w-9 h-5 bg-slate-300 rounded-full peer peer-checked:bg-green-500 peer-focus:outline-none after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
            <span className="text-sm text-slate-600 dark:text-slate-400">
              {status.status === "idle" && "Check for new versions"}
              {status.status === "checking" && "Checking for updates..."}
              {status.status === "available" && "Update found — downloading..."}
              {status.status === "downloading" && `Downloading... ${Math.round((status.info as any).percent)}%`}
              {status.status === "downloaded" && "Update ready — restart to apply"}
              {status.status === "not-available" && "You're up to date"}
              {status.status === "error" && `Update failed: ${(status as { info: string }).info}`}
            </span>
            <div className="flex gap-2">
              {(status.status === "error" || status.status === "not-available" || status.status === "idle") && (
                <button
                  type="button"
                  onClick={() => {
                    checkForUpdate();
                    notify({ type: "info", title: "Checking for updates...", duration: 3000 });
                  }}
                  className="h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm inline-flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  <IconRefresh size={14} />
                  Check for Updates
                </button>
              )}
              {status.status === "downloaded" && (
                <button
                  type="button"
                  onClick={() => window.api.INVOKE(IPC_INVOKE_CHANNEL.QUIT_AND_INSTALL_UPDATE)}
                  className="h-9 px-4 rounded-lg bg-green-600 text-white text-sm inline-flex items-center gap-2 hover:bg-green-700 cursor-pointer"
                >
                  <IconRefresh size={14} />
                  Restart & Update
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconTrash size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Privacy & Browsing Data</h2>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={async () => {
              await window.api.INVOKE(IPC_INVOKE_CHANNEL.CLEAR_BROWSING_DATA);
              notify({ type: "success", title: "Browsing data cleared", duration: 3000 });
            }}
            className="h-10 px-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm inline-flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 cursor-pointer w-fit"
          >
            <IconTrash size={16} />
            Clear All Browsing Data
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Clears cache, cookies, history, site permissions, and adblock filters.
          </span>

          <button
            type="button"
            onClick={async () => {
              await window.api.INVOKE(IPC_INVOKE_CHANNEL.FORCE_CLEAR_CACHE_HARD_RELOAD);
              notify({ type: "info", title: "Cache cleared — reloading active tab", duration: 3000 });
            }}
            className="h-10 px-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 text-sm inline-flex items-center gap-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-200 dark:border-orange-800 cursor-pointer w-fit"
          >
            <IconRefresh size={16} />
            Force Clear Cache & Hard Reload
          </button>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Clears cached resources and forces a full reload of the active tab.
          </span>
        </div>
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm inline-flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-200 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save System Settings
        </button>
      </div>
    </>
  );
};
