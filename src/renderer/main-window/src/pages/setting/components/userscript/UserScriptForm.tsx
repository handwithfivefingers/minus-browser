import { IconDeviceFloppy } from '@tabler/icons-react'
import Prism from 'prismjs'
import { UseFormReturn } from 'react-hook-form'
import Editor from 'react-simple-code-editor'

import { UserScriptSchema } from '~/features/userscript/overlay/schema/userscript'
import FormControl from '~/renderer/sub-window/components/formControl'
import Input from '~/renderer/sub-window/components/input'

import { Switch } from '../../../../components'

import { FormArray, GrantSelector } from './Modal'

interface UserScriptFormProps {
  form: UseFormReturn<UserScriptSchema>
  isEdit: boolean
  onClose: () => void
  onSubmit: (values: UserScriptSchema) => void
}

export const UserScriptForm = ({ form, isEdit, onClose, onSubmit }: UserScriptFormProps) => {
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormControl name="name" className="flex flex-col gap-1.5">
        <Input label="Script Name" />
      </FormControl>
      <FormControl name="namespace" className="flex flex-col gap-1.5">
        <Input label="Namespace" />
      </FormControl>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <FormControl name="version" className="flex flex-col gap-1.5">
          <Input label="Version" placeholder="1.0.0" />
        </FormControl>
        <FormControl name="author" className="flex flex-col gap-1.5">
          <Input label="Author name" />
        </FormControl>
      </div>

      <FormControl name="description" className="flex flex-col gap-1.5">
        <Input label="Description" />
      </FormControl>

      <div className="space-y-2">
        <FormArray label="Matches" name="matches" />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-sm text-slate-600 dark:text-slate-400">Run at</span>
        <div className="flex items-center justify-between">
          <FormControl name="runAt" className="flex flex-col gap-1.5">
            <select
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              defaultValue={'document-end'}
            >
              <option value="document-start">Document Start</option>
              <option value="document-idle">Document Idle</option>
              <option value="document-end">Document End</option>
            </select>
          </FormControl>
          <FormControl
            name="enabled"
            className="flex flex-col gap-1.5"
            render={({ field }) => {
              return <Switch onCheck={field.onChange} value={field.value} />
            }}
          />
        </div>
      </div>
      <GrantSelector name="grants" />
      <FormControl
        name="source"
        className="flex flex-col gap-1.5"
        render={({ field }) => (
          <Editor
            value={field.value}
            onValueChange={(code) => field.onChange(code)}
            highlight={(code) => {
              if (!code) return ''
              return Prism.highlight(code, Prism.languages.js, 'js')
            }}
            padding={10}
            style={{
              fontFamily: 'monospace',
            }}
            className="min-h-65 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs ring-2 ring-transparent transition-all outline-none focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          />
        )}
      />

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          className="h-9 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <IconDeviceFloppy size={14} /> Save Script
        </button>
      </div>
    </form>
  )
}
