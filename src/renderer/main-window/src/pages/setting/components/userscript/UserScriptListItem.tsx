import { IconDownload, IconEdit, IconToggleLeft, IconToggleRight, IconTrash } from '@tabler/icons-react'

import { UserScriptSchema } from '~/features/userscript/overlay/schema/userscript'

interface UserScriptListItemProps {
  script: UserScriptSchema
  onToggle: (id: string, enabled: boolean) => void
  onExport: (script: UserScriptSchema) => void
  onEdit: (script: UserScriptSchema) => void
  onDelete: (id: string) => void
}

export const UserScriptListItem = ({ script, onToggle, onExport, onEdit, onDelete }: UserScriptListItemProps) => {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={() => script.id && onToggle(script.id, !script.enabled)}
          className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
        >
          {script.enabled ? <IconToggleRight size={20} className="text-emerald-600" /> : <IconToggleLeft size={20} />}
        </button>
        <div>
          <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{script.name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {script.enabled ? 'Enabled' : 'Disabled'}
            {script.runAt ? ` • ${script.runAt}` : ''}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={() => onExport(script)}
        >
          <IconDownload size={14} /> Export
        </button>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
          onClick={() => onEdit(script)}
        >
          <IconEdit size={14} /> Edit
        </button>
        <button
          type="button"
          className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs text-red-600 hover:bg-red-100"
          onClick={() => script?.id && onDelete(script.id)}
        >
          <IconTrash size={14} /> Delete
        </button>
      </div>
    </div>
  )
}
