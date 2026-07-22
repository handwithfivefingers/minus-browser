import { IconSnowflake } from '@tabler/icons-react'
import clsx from 'clsx'

import { useMinusThemeStore } from '~/renderer/main-window/src/stores/useMinusTheme'

const HIBERNATE_OPTIONS = [
  { value: 'fast', label: 'Fast', description: 'Hibernate after 15 min - aggressive memory saving' },
  { value: 'normal', label: 'Normal', description: 'Hibernate after 1 hour - balanced' },
  { value: 'slow', label: 'Slow', description: 'Hibernate after 4 hours - tabs stay alive longer' },
  { value: 'custom', label: 'Custom', description: 'Set your own hibernation delay' },
] as const

export const HibernateSetting = () => {
  const { hibernateMode, hibernateCustomMinutes, setHibernateMode, setHibernateCustomMinutes, saved } =
    useMinusThemeStore()

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center gap-2">
          <IconSnowflake size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Hibernate Settings</h2>
        </div>

        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Inactive tabs are automatically hibernated to free system resources. Choose how long a tab must be idle before
          it is hibernated.
        </p>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {HIBERNATE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setHibernateMode(option.value)}
              className={clsx(
                'h-auto cursor-pointer rounded-lg border p-4 text-left transition-all',
                hibernateMode === option.value
                  ? 'border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              )}
            >
              <div className="text-sm font-medium">{option.label}</div>
              <div
                className={clsx(
                  'mt-1 text-xs',
                  hibernateMode === option.value
                    ? 'text-slate-300 dark:text-slate-700'
                    : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {option.description}
              </div>
            </button>
          ))}
        </div>

        {hibernateMode === 'custom' && (
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
                  className="h-10 w-32 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
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
          className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <IconSnowflake size={16} />
          Save Hibernate Settings
        </button>
      </div>
    </>
  )
}
