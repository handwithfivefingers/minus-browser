import {
  IconCode,
  IconDeviceFloppy,
  IconDownload,
  IconEdit,
  IconPlus,
  IconToggleLeft,
  IconToggleRight,
  IconTrash,
  IconUpload,
  IconWorldUpload,
  IconX,
} from '@tabler/icons-react'
import Prism from 'prismjs'
import { ReactNode, useEffect, useState } from 'react'
import Editor from 'react-simple-code-editor'

import { generateMetadataBlock, parseUserScriptMetadata } from '~/features/userscript/parser'

// @ts-ignore
import 'prismjs/themes/prism.min.css'
import { FormProvider, useFieldArray, useForm, useFormContext } from 'react-hook-form'

import { userScriptResolve, UserScriptSchema } from '~/features/userscript/overlay/schema/userscript'
import FormControl from '~/renderer/sub-window/components/formControl'
import Input from '~/renderer/sub-window/components/input'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { Switch } from '../../../components'
import { cn } from '../../../libs/cn'

const FORM_DEFAULT: Partial<UserScriptSchema> = {
  name: 'New Script',
  source: '',
  matches: ['*'],
  runAt: 'document-end',
  enabled: false,
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

const UserScriptSection = () => {
  const [scripts, setScripts] = useState<UserScriptSchema[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const form = useForm<UserScriptSchema>({
    defaultValues: FORM_DEFAULT,
    resolver: userScriptResolve,
  })

  const loadScripts = async () => {
    const list = await window.api.INVOKE<UserScriptSchema[]>(IPC_INVOKE_CHANNEL.GET_USERSCRIPTS)
    setScripts(list || [])
  }

  useEffect(() => {
    loadScripts()
  }, [])

  const openCreateModal = () => {
    // formRef.current = { name: 'New Script', source: '', matches: ['*'], runAt: 'document-end', enabled: false }
    form.setValues(FORM_DEFAULT)
    setModalOpen(true)
  }

  const openEditModal = (script: UserScriptSchema) => {
    // formRef.current = { ...script }
    form.setValues(script)
    // parseAndPopulate(script.source)
    setModalOpen(true)
  }

  // const handleSourceChange = (source: string) => {
  //   formRef.current.source = source
  //   parseAndPopulate(source)
  //   forceUpdate()
  // }

  const onImportScript = async () => {
    await window.api.INVOKE(IPC_INVOKE_CHANNEL.IMPORT_USERSCRIPT)
    loadScripts()
  }

  const onImportFromURL = async () => {
    const url = window.prompt('Enter .user.js URL:')
    if (!url) return
    try {
      const res = await fetch(url)
      const source = await res.text()
      const meta = parseUserScriptMetadata(source)
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, {
        source,
        name: meta?.name || `Import-${Date.now()}`,
        matches: meta?.matches || ['*'],
        runAt: meta?.runAt || 'document-end',
        enabled: false,
      })
      loadScripts()
    } catch (e) {
      console.error('Import failed', e)
    }
  }

  const onExportScript = (script: UserScriptSchema) => {
    const meta = parseUserScriptMetadata(script.source)
    const header = meta ? generateMetadataBlock(meta) : ''
    const body = header
      ? script.source.replace(/\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\n?/m, '')
      : script.source
    const content = header + '\n' + body.trimStart()
    const blob = new Blob([content], { type: 'text/javascript' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${script.name.replace(/[^a-zA-Z0-9]/g, '_')}.user.js`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const onDeleteScript = async (id: string) => {
    await window.api.INVOKE(IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT, { id })
    loadScripts()
  }

  const onToggleScript = async (id: string, enabled: boolean) => {
    await window.api.INVOKE(IPC_INVOKE_CHANNEL.TOGGLE_USERSCRIPT, { id, enabled })
    loadScripts()
  }

  const onSaveScript = async (values: UserScriptSchema) => {
    const normalized = {
      ...values,
      name: values.name.trim() || 'New Script',
      matches: values.matches?.map((m) => m.trim()).filter(Boolean),
      excludes: values.excludes?.map((m) => m.trim()).filter(Boolean),
      includes: values.includes?.map((m) => m.trim()).filter(Boolean),
      connect: values.connect?.filter(Boolean),
    }
    if (!normalized.matches?.length) normalized.matches = ['*']
    await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, normalized)
    setModalOpen(false)
    loadScripts()
  }
  return (
    <FormProvider {...form}>
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconCode size={18} className="text-slate-700 dark:text-slate-300" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">UserScript Manager</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              onClick={onImportScript}
            >
              <IconUpload size={15} /> Import
            </button>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-sm hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
              onClick={onImportFromURL}
            >
              <IconWorldUpload size={15} /> From URL
            </button>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={openCreateModal}
            >
              <IconPlus size={15} /> New Script
            </button>
          </div>
        </div>

        <div className="max-h-115 space-y-2 overflow-auto pr-1">
          {scripts.map((script) => (
            <div
              key={script.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => script.id && onToggleScript(script.id, !script.enabled)}
                  className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  {script.enabled ? (
                    <IconToggleRight size={20} className="text-emerald-600" />
                  ) : (
                    <IconToggleLeft size={20} />
                  )}
                </button>
                <div>
                  <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{script.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {script.enabled ? 'Enabled' : 'Disabled'}
                    {script.runAt ? ` • ${script.runAt}` : ''}
                    {/* {script.updatedAt ? ` • Updated ${new Date(script.updatedAt).toLocaleString()}` : ''} */}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => onExportScript(script)}
                >
                  <IconDownload size={14} /> Export
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                  onClick={() => openEditModal(script)}
                >
                  <IconEdit size={14} /> Edit
                </button>
                <button
                  type="button"
                  className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs text-red-600 hover:bg-red-100"
                  onClick={() => script?.id && onDeleteScript(script.id)}
                >
                  <IconTrash size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <Modal
          title={form.getValues('id') ? 'Edit Userscript' : 'Create Userscript'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        >
          <form onSubmit={form.handleSubmit(onSaveScript)} className="space-y-4">
            {/* <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Script Name</span>
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                value={formRef.current.name}
                onChange={(e) => patchSelected({ field: 'name', value: e.target.value })}
                placeholder="My Script"
              />
            </label> */}
            <FormControl name="name" className="flex flex-col gap-1.5">
              <Input label="Script Name" />
            </FormControl>
            {/* <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Namespace</span>
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                value={formRef.current.namespace || ''}
                onChange={(e) => patchSelected({ field: 'namespace', value: e.target.value })}
                placeholder="https://example.com/"
              />
            </label> */}
            <FormControl name="namespace" className="flex flex-col gap-1.5">
              <Input label="Namespace" />
            </FormControl>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {/* <label className="flex flex-col gap-1.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Version</span>
                <input
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  value={formRef.current.version || ''}
                  onChange={(e) => patchSelected({ field: 'version', value: e.target.value })}
                  placeholder="1.0.0"
                />
              </label> */}
              {/* <label className="flex flex-col gap-1.5">
                <span className="text-sm text-slate-600 dark:text-slate-400">Author</span>
                <input
                  className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                  value={formRef.current.author || ''}
                  onChange={(e) => patchSelected({ field: 'author', value: e.target.value })}
                  placeholder="Author name"
                />
              </label> */}
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
            {/* 
            <FormControl
              name="grants"
              render={({ field }) => {
                console.log('field.value', field.value)
                return (
                  <GrantSelector
                    value={field.value as string[]}
                    onUpdate={(v) => {
                      field.onChange(v)
                    }}
                  />
                )
              }}
            /> */}
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
            {/* <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Script Source</span>
              <Editor
                value={formRef.current.source}
                onValueChange={(code) => handleSourceChange(code)}
                highlight={(code) => {
                  if (!code) return ''
                  return Prism.highlight(code, Prism.languages.js, 'js')
                }}
                padding={10}
                style={{
                  fontFamily: 'monospace',
                }}
                className="min-h-[260px] rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs ring-2 ring-transparent transition-all outline-none focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              />
            </label> */}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="h-9 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                // onClick={onSaveScript}
              >
                <IconDeviceFloppy size={14} /> Save Script
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </FormProvider>
  )
}
const Modal = ({
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
                // key={grant}
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
export { UserScriptSection }
