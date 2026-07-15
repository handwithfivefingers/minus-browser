import { IconSnowflake } from "@tabler/icons-react";
import clsx from "clsx";
import { useMinusThemeStore } from "~/renderer/main-window/src/stores/useMinusTheme";

const HIBERNATE_OPTIONS = [
  { value: "fast", label: "Fast", description: "Hibernate after 15 min - aggressive memory saving" },
  { value: "normal", label: "Normal", description: "Hibernate after 1 hour - balanced" },
  { value: "slow", label: "Slow", description: "Hibernate after 4 hours - tabs stay alive longer" },
  { value: "custom", label: "Custom", description: "Set your own hibernation delay" },
] as const;

export const HibernateSetting = () => {
  const { hibernateMode, hibernateCustomMinutes, setHibernateMode, setHibernateCustomMinutes, saved } =
    useMinusThemeStore();

  return (
    <>
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconSnowflake size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">Hibernate Settings</h2>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Inactive tabs are automatically hibernated to free system resources. Choose how long a tab must be idle before
          it is hibernated.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {HIBERNATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setHibernateMode(option.value)}
              className={clsx(
                "h-auto p-4 rounded-lg border text-left cursor-pointer transition-all",
                hibernateMode === option.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div
                className={clsx("text-xs mt-1", hibernateMode === option.value ? "text-slate-300" : "text-slate-500")}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {hibernateMode === "custom" && (
          <div className="mt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600">Custom timeout (minutes)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={hibernateCustomMinutes || 60}
                  onChange={(e) => setHibernateCustomMinutes(Math.max(1, Number(e.target.value)))}
                  className="h-10 w-32 px-3 rounded-lg border border-slate-300 bg-white text-sm"
                />
                <span className="text-xs text-slate-400">min (1 - 1440)</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconSnowflake size={16} />
          Save Hibernate Settings
        </button>
      </div>
    </>
  );
};
