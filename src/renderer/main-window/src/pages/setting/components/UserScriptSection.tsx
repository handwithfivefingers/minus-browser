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
import clsx from 'clsx'
import Prism from 'prismjs'
import { ReactNode, useEffect, useRef, useState } from 'react'
import Editor from 'react-simple-code-editor'

import { parseUserScriptMetadata, generateMetadataBlock, metadataToPartialScript } from '~/features/userscript/parser'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'
// @ts-ignore
import 'prismjs/themes/prism.min.css'

type UserScriptRunAt = 'document-start' | 'document-idle' | 'document-end'

interface IUserScript {
  id?: string
  name: string
  source: string
  enabled?: boolean
  matches?: string[]
  excludes?: string[]
  includes?: string[]
  namespace?: string
  version?: string
  description?: string
  author?: string
  grants?: string[]
  noframes?: boolean
  connect?: string[]
  requires?: Array<{ url: string }>
  resources?: Array<{ name: string; url: string }>
  runAt?: UserScriptRunAt
  updatedAt?: number
  builtIn?: boolean
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
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-slate-900/55 p-4" onClick={onClose}>
      <div
        className="scrollbar max-h-[88vh] w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
        style={{}}
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

const UserScriptSection = () => {
  const [scripts, setScripts] = useState<IUserScript[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const formRef = useRef<IUserScript>({
    name: 'New Script',
    source: '',
    matches: ['*'],
    runAt: 'document-end',
    enabled: false,
  })
  const [, setTick] = useState(0)
  const forceUpdate = () => setTick((t) => t + 1)
  const patchSelected = <K extends keyof IUserScript>({ field, value }: { field: K; value: IUserScript[K] }) => {
    formRef.current[field] = value
    forceUpdate()
  }

  const loadScripts = async () => {
    const list = await window.api.INVOKE<IUserScript[]>(IPC_INVOKE_CHANNEL.GET_USERSCRIPTS)
    setScripts(list || [])
  }

  useEffect(() => {
    loadScripts()
  }, [])

  const parseAndPopulate = (source: string) => {
    const meta = parseUserScriptMetadata(source)
    if (meta) {
      Object.assign(formRef.current, metadataToPartialScript(meta))
    }
    forceUpdate()
  }

  const openCreateModal = () => {
    formRef.current = { name: 'New Script', source: '', matches: ['*'], runAt: 'document-end', enabled: false }
    setModalOpen(true)
  }

  const openEditModal = (script: IUserScript) => {
    formRef.current = { ...script }
    parseAndPopulate(script.source)
    setModalOpen(true)
  }

  const handleSourceChange = (source: string) => {
    formRef.current.source = source
    parseAndPopulate(source)
    forceUpdate()
  }

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

  const onExportScript = (script: IUserScript) => {
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

  const onSaveScript = async () => {
    const normalized = {
      ...formRef.current,
      name: formRef.current.name.trim() || 'New Script',
      matches: formRef.current.matches?.map((m) => m.trim()).filter(Boolean),
      excludes: formRef.current.excludes?.map((m) => m.trim()).filter(Boolean),
      includes: formRef.current.includes?.map((m) => m.trim()).filter(Boolean),
      connect: formRef.current.connect?.filter(Boolean),
    }
    if (!normalized.matches?.length) normalized.matches = ['*']
    await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, normalized)
    setModalOpen(false)
    loadScripts()
  }

  return (
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

      <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
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
                  {script.updatedAt ? ` • Updated ${new Date(script.updatedAt).toLocaleString()}` : ''}
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
        title={formRef.current.id ? 'Edit Userscript' : 'Create Userscript'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Script Name</span>
            <input
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              value={formRef.current.name}
              onChange={(e) => patchSelected({ field: 'name', value: e.target.value })}
              placeholder="My Script"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Namespace</span>
            <input
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              value={formRef.current.namespace || ''}
              onChange={(e) => patchSelected({ field: 'namespace', value: e.target.value })}
              placeholder="https://example.com/"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Version</span>
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                value={formRef.current.version || ''}
                onChange={(e) => patchSelected({ field: 'version', value: e.target.value })}
                placeholder="1.0.0"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Author</span>
              <input
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                value={formRef.current.author || ''}
                onChange={(e) => patchSelected({ field: 'author', value: e.target.value })}
                placeholder="Author name"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Description</span>
            <input
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              value={formRef.current.description || ''}
              onChange={(e) => patchSelected({ field: 'description', value: e.target.value })}
              placeholder="Script description"
            />
          </label>

          <div className="space-y-2">
            <FormArray
              label="Matches"
              values={formRef.current.matches || []}
              onUpdate={(v) => {
                formRef.current.matches = v
                forceUpdate()
              }}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Run At</span>
              <select
                className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                value={formRef.current.runAt}
                onChange={(e) => patchSelected({ field: 'runAt', value: e.target.value as UserScriptRunAt })}
              >
                <option value="document-start">Document Start</option>
                <option value="document-idle">Document Idle</option>
                <option value="document-end">Document End</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600 dark:text-slate-400">Enabled</span>
              <div
                className="relative mt-1 inline-flex cursor-pointer items-center"
                onClick={() => patchSelected({ field: 'enabled', value: !formRef.current.enabled })}
                role="switch"
                aria-checked={formRef.current.enabled}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ')
                    patchSelected({ field: 'enabled', value: !formRef.current.enabled })
                }}
              >
                <input type="checkbox" className="peer sr-only" checked={formRef.current.enabled} readOnly />
                <div
                  className={clsx(
                    "peer h-5 w-9 rounded-full after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:after:translate-x-full",
                    formRef.current.enabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
                  )}
                />
              </div>
            </label>
          </div>

          <GrantSelector
            values={formRef.current.grants || []}
            onUpdate={(v) => {
              formRef.current.grants = v
              forceUpdate()
            }}
          />

          <label className="flex flex-col gap-1.5">
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
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="h-9 cursor-pointer rounded-lg border border-slate-300 px-3 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-300"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={onSaveScript}
            >
              <IconDeviceFloppy size={14} /> Save Script
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export { UserScriptSection }

const GrantSelector = ({ values, onUpdate }: { values: string[]; onUpdate: (v: string[]) => void }) => {
  const enabled = new Set(values)
  const toggle = (grant: string) => {
    if (grant === 'none') {
      onUpdate(['none'])
      return
    }
    const next = new Set(values.filter((g) => g !== 'none'))
    if (next.has(grant)) next.delete(grant)
    else next.add(grant)
    onUpdate([...next])
  }
  return (
    <div className="space-y-1.5">
      <div className="text-sm text-slate-600 dark:text-slate-400">@grant</div>
      <div className="flex flex-wrap gap-1.5">
        {GRANT_OPTIONS.map((grant) => (
          <button
            key={grant}
            type="button"
            onClick={() => toggle(grant)}
            className={clsx(
              'cursor-pointer rounded-md border px-2 py-1 text-xs',
              enabled.has(grant)
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
                : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-400 dark:hover:border-slate-500'
            )}
          >
            {grant}
          </button>
        ))}
      </div>
    </div>
  )
}

const FormArray = ({
  label,
  values,
  onUpdate,
}: {
  label: string
  values: string[]
  onUpdate: (v: string[]) => void
}) => {
  const localValues = useRef<string[]>([...values])
  const [, setTick] = useState(0)
  const inputRef = useRef<HTMLInputElement[]>([])
  const forceUpdate = () => setTick((t) => t + 1)

  useEffect(() => {
    localValues.current = [...values]
    forceUpdate()
  }, [values])

  const add = () => {
    localValues.current = [...localValues.current, '']
    forceUpdate()
    setTimeout(() => inputRef.current[localValues.current.length - 1]?.focus(), 100)
  }
  const change = (idx: number, val: string) => {
    localValues.current[idx] = val
    onUpdate([...localValues.current])
  }
  const remove = (idx: number) => {
    localValues.current = localValues.current.filter((_, i) => i !== idx)
    onUpdate([...localValues.current])
    forceUpdate()
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
        <button
          type="button"
          className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2 text-xs hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-700"
          onClick={add}
        >
          <IconPlus size={13} /> Add
        </button>
      </div>
      {localValues.current.map((v, idx) => (
        <div key={`${label}-${idx}-${v}`} className="mb-1.5 flex gap-2">
          <input
            className="h-8 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            value={v}
            onChange={(e) => change(idx, e.target.value)}
            ref={(r) => {
              if (r) inputRef.current[idx] = r
            }}
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
            onClick={() => remove(idx)}
          >
            <IconTrash size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
