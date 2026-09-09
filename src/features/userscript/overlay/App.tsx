import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { v7 as uuid_v7 } from 'uuid'

import { useNotificationStore } from '~/renderer/main-window/src/stores/useNotificationStore'
// Notification store is bundled via ~ alias but isolated to sub-window renderer instance.
// Keep notify for overlay feedback; main-window toast will show after close via shared state if needed.
import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

import { UserScriptForm } from './form'
import { userScriptResolve, UserScriptSchema } from './schema/userscript'

interface ScriptItem {
  id: string
  name: string
  source: string
  matches?: string[]
  runAt?: 'document-start' | 'document-end' | 'document-idle'
  enabled?: boolean
}

const App = () => {
  const [items, setItems] = useState<ScriptItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openState, setOpenState] = useState(false)
  const { notify } = useNotificationStore()

  const safeNotify: typeof notify = (opts) => {
    try {
      notify(opts)
    } catch {
      // Fallback: sub-window store isolated; log for main window toast after close
      console.warn('[userscript overlay] notify fallback:', opts.title, opts.message)
    }
  }

  const originalIdsRef = useRef<Set<string>>(new Set())
  const form = useForm<UserScriptSchema>({
    defaultValues: {
      enabled: false,
      grants: [],
      runAt: 'document-start',
    },
    resolver: userScriptResolve,
  })

  useEffect(() => {
    const raw = sessionStorage.getItem('subWindowPayload')
    sessionStorage.removeItem('subWindowPayload')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        const nextItems: ScriptItem[] = Array.isArray(data.items) ? data.items.map((item: any) => ({ ...item })) : []
        setItems(nextItems)
        setSelectedId(null)
        form.reset({ enabled: false, grants: [], runAt: 'document-start' } as unknown as UserScriptSchema)
        setOpenState(true)
        originalIdsRef.current = new Set(nextItems.map((i) => i.id))
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleCancel = useCallback(() => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openState) {
        handleCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openState, handleCancel])

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId])
  if (!openState) return <div style={{ display: 'none' }} />

  const createNew = () => {
    const id = uuid_v7()
    const item: ScriptItem = {
      id,
      name: 'New Script',
      source: '',
      runAt: 'document-end',
      matches: ['*'],
      enabled: false,
    }
    form.reset(item as unknown as UserScriptSchema)
    setItems((prev) => [item, ...prev])
    setSelectedId(id)
  }

  const onSubmit = async () => {
    if (!selected) return
    const formValues = form.getValues()
    if (!formValues.source?.trim()) {
      safeNotify({ title: 'Validation failed', message: 'Script source is required', type: 'error' })
      return
    }
    // Normalize to match UserScriptSection.tsx:127-135
    const normalizedValues = {
      ...formValues,
      name: formValues.name?.trim() || 'New Script',
      matches: formValues.matches?.map((m: string) => m.trim()).filter(Boolean),
      excludes: formValues.excludes?.map((m: string) => m.trim()).filter(Boolean),
      includes: formValues.includes?.map((m: string) => m.trim()).filter(Boolean),
      connect: formValues.connect?.filter(Boolean),
    } as typeof formValues
    if (!normalizedValues.matches?.length) normalizedValues.matches = ['*']
    const updatedItems = items.map((it) => (it.id === selected.id ? { ...it, ...normalizedValues, id: it.id } : it))
    try {
      const currentIds = new Set(updatedItems.map((i) => i.id))
      for (const originalId of originalIdsRef.current) {
        if (!currentIds.has(originalId)) {
          await window.api.INVOKE(IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT, { id: originalId })
        }
      }
      for (const script of updatedItems) {
        if (script?.id) {
          await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, script)
        }
      }
      setItems(updatedItems)
      safeNotify({ title: 'Scripts saved', type: 'success' })
      window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
    } catch (e) {
      safeNotify({ title: 'Save failed', message: String(e), type: 'error' })
    }
  }

  const removeSelected = () => {
    if (!selected) return
    const next = items.filter((it) => it.id !== selected.id)
    setItems(next)
    if (next.length > 0) {
      setSelectedId(next[0].id)
      form.reset(next[0] as unknown as UserScriptSchema)
    } else {
      setSelectedId(null)
      form.reset({ enabled: false, grants: [], runAt: 'document-start' } as unknown as UserScriptSchema)
    }
  }

  return (
    <div
      className="grid h-full w-200 overflow-hidden rounded"
      style={{
        gridTemplateColumns: '250px 1fr',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-2 p-3">
        <div>
          <button
            type="button"
            className="h-7 cursor-pointer rounded-lg border border-slate-600 bg-slate-900 px-2.5 text-xs text-white transition-colors hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={createNew}
          >
            + New
          </button>
        </div>
        <div className="flex flex-col gap-1">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                form.reset(item)
                setSelectedId(item.id)
              }}
              style={{
                borderRadius: '8px',
                textAlign: 'left',
                padding: '8px',
                cursor: 'pointer',
              }}
              className={clsx('border border-white/50 dark:border-slate-600', {
                ['bg-slate-800 text-white dark:bg-slate-700']: selected?.id !== item.id,
                ['bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200']: selected?.id === item.id,
              })}
            >
              <div className="truncate font-medium">{item.name || 'Unnamed Script'}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {item.enabled ? 'ON' : 'OFF'} &bull; {item.runAt || 'document-end'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex h-full flex-col gap-2 overflow-auto px-3">
        <FormProvider {...form}>
          <div className="flex items-center justify-between">
            <div className="font-medium text-slate-800 dark:text-white">Edit Script</div>
          </div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-1 flex-col gap-1 overflow-hidden p-2">
            {selected ? <UserScriptForm /> : null}
            <div className="flex shrink-0 justify-end gap-2">
              <button
                type="button"
                onClick={removeSelected}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  background: '#fee2e2',
                  color: '#b91c1c',
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
              <button
                type="submit"
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  background: '#0f172a',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                Apply
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  fontSize: 12,
                  padding: '4px 8px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  background: '#e2e8f0',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  )
}

export default App
