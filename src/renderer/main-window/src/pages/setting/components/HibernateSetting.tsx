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
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
        <div className="flex items-center gap-2 mb-4">
          <IconSnowflake size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hibernate Settings</h2>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
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
                  ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700",
              )}
            >
              <div className="font-medium text-sm">{option.label}</div>
              <div
                className={clsx("text-xs mt-1", hibernateMode === option.value ? "text-slate-300 dark:text-slate-700" : "text-slate-500 dark:text-slate-400")}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {hibernateMode === "custom" && (
          <div className="mt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Custom timeout (minutes)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={hibernateCustomMinutes || 60}
                  onChange={(e) => setHibernateCustomMinutes(Math.max(1, Number(e.target.value)))}
                  className="h-10 w-32 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
                />
                <span className="text-xs text-slate-400 dark:text-slate-500">min (1 - 1440)</span>
              </div>
            </label>
          </div>
        )}
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={saved}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm inline-flex items-center gap-2 hover:bg-slate-700 dark:hover:bg-slate-200 cursor-pointer"
        >
          <IconSnowflake size={16} />
          Save Hibernate Settings
        </button>
      </div>
    </>
  );
};
