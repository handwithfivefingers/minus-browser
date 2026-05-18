import { IconDatabase, IconDeviceFloppy, IconLayoutGrid } from "@tabler/icons-react";
import clsx from "clsx";
import { useMinusThemeStore } from "~/features/ui/stores/useMinusTheme";
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
  const { layout, dataSync, savedCookies, setDataSyncTime, setCookieMode, setLayout, saved } = useMinusThemeStore();
  return (
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

        {/* <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Hardware Acceleration</span>
          <select
            value={dataSync.hardwareAcceleration}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                hardwareAcceleration: event.target.value,
              }))
            }
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="0">Off</option>
            <option value="1">On</option>
          </select>
        </label> */}
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
    </div>
  );
};
