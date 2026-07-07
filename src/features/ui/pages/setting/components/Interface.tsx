import { IconClock, IconDatabase, IconDeviceFloppy, IconLayoutGrid, IconRefresh } from "@tabler/icons-react";
import clsx from "clsx";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";
import { useUpdateStore } from "~/features/ui/stores/useUpdateStore";
import { useNotificationStore } from "~/features/ui/stores/useNotificationStore";
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

export const Interface = () => {
  const { layout, dataSync, savedCookies, historyRetentionDays, autoDownload, setDataSyncTime, setCookieMode, setLayout, setHistoryRetentionDays, setAutoDownload, saved } = useMinusThemeStore();
  const { status, checkForUpdate } = useUpdateStore();
  const { notify } = useNotificationStore();
  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconDatabase size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">System Preferences</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Sync Data Interval</span>
            <select
              value={dataSync.intervalTime}
              onChange={(event) => setDataSyncTime(event.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              <option value="15">15 sec</option>
              <option value="30">30 sec</option>
              <option value="45">45 sec</option>
              <option value="60">60 sec</option>
              <option value="off">Off</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Cookie saved as</span>
            <select
              value={savedCookies}
              onChange={(event) => setCookieMode(event.target.value as "0" | "1")}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            >
              <option value="0">System</option>
              <option value="1">File</option>
            </select>
          </label>

          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600">Layout Template</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                type="button"
                className={clsx(
                  "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                  layout === LayoutTemplate.BASIC
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
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
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
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

      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconClock size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">History</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Auto-delete history after (days)</span>
            <input
              type="number"
              min="1"
              max="365"
              value={historyRetentionDays || "30"}
              onChange={(e) => setHistoryRetentionDays(e.target.value)}
              className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
            />
            <span className="text-xs text-slate-400">Entries older than this many days are automatically removed. Set to 0 to keep forever.</span>
          </label>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
        <div className="flex items-center gap-2 mb-4">
          <IconRefresh size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Updates</h2>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm text-slate-600">Auto-download updates</span>
              <span className="text-xs text-slate-400">Download and prepare updates in the background</span>
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

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-sm text-slate-600">
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
                  className="h-9 px-4 rounded-lg border border-slate-300 text-sm inline-flex items-center gap-2 hover:bg-slate-50 cursor-pointer"
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

      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save System Settings
        </button>
      </div>
    </>
  );
};
