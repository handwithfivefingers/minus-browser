import { IconCode, IconPlus, IconUpload, IconWorldUpload } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { userScriptResolve, UserScriptSchema } from '~/features/userscript/overlay/schema/userscript'
import { generateMetadataBlock, parseUserScriptMetadata } from '~/features/userscript/parser'
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'

import { Modal } from './userscript/Modal'
import { UserScriptForm } from './userscript/UserScriptForm'
import { UserScriptListItem } from './userscript/UserScriptListItem'

const FORM_DEFAULT: Partial<UserScriptSchema> = {
  name: 'New Script',
  source: '',
  matches: ['*'],
  runAt: 'document-end',
  enabled: false,
}

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
    form.setValues(FORM_DEFAULT)
    setModalOpen(true)
  }

  const openEditModal = (script: UserScriptSchema) => {
    form.setValues(script)
    setModalOpen(true)
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
            <UserScriptListItem
              key={script.id}
              script={script}
              onToggle={onToggleScript}
              onExport={onExportScript}
              onEdit={openEditModal}
              onDelete={onDeleteScript}
            />
          ))}
        </div>

        <Modal
          title={form.getValues('id') ? 'Edit Userscript' : 'Create Userscript'}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        >
          <UserScriptForm
            form={form}
            isEdit={!!form.getValues('id')}
            onClose={() => setModalOpen(false)}
            onSubmit={onSaveScript}
          />
        </Modal>
      </div>
    </FormProvider>
  )
}
export { UserScriptSection }
