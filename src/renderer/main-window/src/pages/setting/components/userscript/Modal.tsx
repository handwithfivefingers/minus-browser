import { IconPlus, IconTrash, IconX } from '@tabler/icons-react'
import { ReactNode } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import { UserScriptSchema } from '~/features/userscript/overlay/schema/userscript'
import FormControl from '~/renderer/sub-window/components/formControl'
import Input from '~/renderer/sub-window/components/input'

import { cn } from '../../../../libs/cn'

export const Modal = ({
  title,
  open,
  onClose,
  children,
}: {
  title: string
  open: boolean
  onClose: () => void
  children: ReactNode
}) => {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-900/55 p-4"
      onClick={onClose}
      aria-hidden
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl scrollbar-thin overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
        aria-hidden
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <button
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            onClick={onClose}
            type="button"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const GRANT_OPTIONS = [
  'unsafeWindow',
  'GM_info',
  'GM_getValue',
  'GM_setValue',
  'GM_deleteValue',
  'GM_listValues',
  'GM_getResourceText',
  'GM_getResourceURL',
  'GM_addStyle',
  'GM_addElement',
  'GM_download',
  'GM_getTab',
  'GM_saveTab',
  'GM_getTabs',
  'GM_log',
  'GM_notification',
  'GM_openInTab',
  'GM_setClipboard',
  'GM_xmlhttpRequest',
  'GM_registerMenuCommand',
  'GM_unregisterMenuCommand',
  'window.close',
  'window.focus',
]

const GrantSelector = ({ name }: { name: string }) => {
  const form = useFormContext<UserScriptSchema>()
  const values = form.getValues('grants')
  const fieldArrays = useFieldArray({
    name,
  })

  return (
    <div className="space-y-1.5">
      <div className="text-sm text-slate-600 dark:text-slate-400">@grant</div>
      <div className="flex flex-wrap gap-1.5">
        {fieldArrays.fields.map((field, index) => (
          <FormControl
            name={`${name}.${index}`}
            key={field.id}
            render={({ field: fieldControl }) => (
              <button
                type="button"
                onClick={() => fieldArrays.remove(index)}
                className={cn(
                  'cursor-pointer rounded-md border px-2 py-1 text-xs',
                  'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                )}
              >
                {fieldControl.value}
              </button>
            )}
          />
        ))}
        {GRANT_OPTIONS.filter((grant) => !values?.includes(grant))?.map((grant) => (
          <button
            key={grant}
            type="button"
            onClick={() => fieldArrays.append(grant)}
            className={cn(
              'cursor-pointer rounded-md border px-2 py-1 text-xs',
              'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-slate-500'
            )}
          >
            {grant}
          </button>
        ))}
      </div>
    </div>
  )
}

const FormArray = ({ label, name }: { label: string; name: string }) => {
  const fieldArrays = useFieldArray({
    name,
  })

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <button
          type="button"
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={() => fieldArrays.append('*.**/*')}
        >
          <IconPlus size={13} /> Add
        </button>
      </div>
      {fieldArrays.fields.map((field, idx) => (
        <div key={field.id} className="mb-1.5 flex gap-2">
          <FormControl key={field.id} name={`${name}.${idx}`}>
            <Input />
          </FormControl>
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            onClick={() => fieldArrays.remove(idx)}
          >
            <IconTrash size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

export { FormArray, GrantSelector }
