import clsx from 'clsx'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

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

const Button = ({
  onClick,
  children,
  style,
}: {
  onClick: () => void
  children?: React.ReactNode
  style?: React.CSSProperties
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-2 h-[30px] cursor-pointer rounded-lg border border-transparent bg-slate-900 px-2.5 text-white dark:bg-slate-700"
      style={style}
    >
      {children}
    </button>
  )
}

const App = () => {
  const [items, setItems] = useState<ScriptItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openState, setOpenState] = useState(false)

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
        setSelectedId(nextItems[0]?.id ?? null)
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
    const id = `new-${Math.random().toString(36).slice(2)}`
    const item: ScriptItem = {
      id,
      name: 'New Script',
      source: '',
      runAt: 'document-end',
      matches: ['*'],
      enabled: false,
    }
    form.reset(item)
    setItems((prev) => [item, ...prev])
    setSelectedId(id)
  }

  const onSubmit = async () => {
    if (!selected) return
    const formValues = form.getValues()
    // Save the form values back to the selected item in items
    setItems((prev) => prev.map((it) => (it.id === selected.id ? { ...it, ...formValues, id: it.id } : it)))
    const currentIds = new Set(items.map((i) => i.id))
    for (const originalId of originalIdsRef.current) {
      if (!currentIds.has(originalId)) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT, originalId)
      }
    }
    // Save all current items
    const updatedItems = items.map((it) => (it.id === selected.id ? { ...it, ...formValues, id: it.id } : it))
    for (const script of updatedItems) {
      if (script?.id) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, script)
      }
    }
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  const removeSelected = () => {
    if (!selected) return
    const next = items.filter((it) => it.id !== selected.id)
    setItems(next)
    setSelectedId(next[0]?.id || null)
    if (next.length === 0) {
      form.reset({ enabled: false, grants: [], runAt: 'document-start' })
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
