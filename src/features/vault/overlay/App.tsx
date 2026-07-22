import clsx from 'clsx'
import React, { useMemo, useRef, useState } from 'react'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

type VaultItem = {
  id: string
  site: string
  username: string
  password: string
  notes?: string
}

const App = () => {
  const [items, setItems] = useState<VaultItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [openState, setOpenState] = React.useState<boolean>(false)
  const originalItemsRef = useRef<VaultItem[]>([])

  React.useEffect(() => {
    const raw = sessionStorage.getItem('subWindowPayload')
    sessionStorage.removeItem('subWindowPayload')
    if (raw) {
      try {
        const data = JSON.parse(raw)
        const nextItems: VaultItem[] = Array.isArray(data.items) ? data.items.map((item: any) => ({ ...item })) : []
        originalItemsRef.current = nextItems.map((item: VaultItem) => ({ ...item }))
        setItems(nextItems)
        setSelectedId(nextItems[0]?.id ?? null)
        setShowPassword(false)
        setOpenState(true)
      } catch {
        /* ignore */
      }
    }
  }, [])

  const handleSave = async () => {
    const originalIds = new Set(originalItemsRef.current.map((v: VaultItem) => v.id))
    const currentIds = new Set(items.map((v: VaultItem) => v.id))
    for (const vault of items) {
      if (!vault.id || vault.id.startsWith('new-')) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_ADD, {
          site: vault.site,
          username: vault.username,
          password: vault.password,
          notes: vault.notes || '',
        })
      } else {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_UPDATE, { id: vault.id, patch: vault })
      }
    }
    for (const item of originalItemsRef.current) {
      if (!currentIds.has(item.id)) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_DELETE, { id: item.id })
      }
    }
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  const handleCancel = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && openState) {
        handleCancel()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openState])

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId])

  if (!openState) {
    return <div style={{ display: 'none' }} />
  }

  const setSelectedField = (key: keyof VaultItem, value: string) => {
    if (!selected) return
    setItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, [key]: value } : item)))
  }

  const removeSelected = () => {
    if (!selected) return
    const next = items.filter((item) => item.id !== selected.id)
    setItems(next)
    setSelectedId(next[0]?.id ?? null)
  }

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`
    const next: VaultItem[] = [{ id, site: '', username: '', password: '', notes: '' }, ...items]
    setItems(next)
    setSelectedId(id)
    setShowPassword(false)
  }

  return (
    <div
      className="h-[80vh]overflow-hidden grid w-200 rounded text-slate-800 dark:text-white"
      style={{
        gridTemplateColumns: '300px 1fr',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-2 overflow-auto border-r border-slate-200 p-3 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="h-7 cursor-pointer rounded-lg border border-slate-600 bg-slate-900 px-2.5 text-xs text-white transition-colors hover:bg-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600"
            onClick={createNew}
          >
            + New
          </button>
        </div>

        {items.length === 0 && (
          <div className="py-1 text-xs text-slate-400 dark:text-slate-500">No credentials yet.</div>
        )}

        <div className="flex flex-col gap-1.5">
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={clsx('cursor-pointer rounded-lg border border-white/50 p-2 text-left dark:border-slate-600', {
                ['bg-slate-800 text-white dark:bg-slate-700']: selectedId === item.id,
                ['bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-200']: selectedId !== item.id,
              })}
            >
              <div className="text-sm font-medium">{item.site || 'new site'}</div>
              <div className="text-xs font-light">{item.username || '—'}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 overflow-auto p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">{selected ? 'Edit Credential' : 'Select a credential'}</div>
        </div>

        {selected ? (
          <>
            <label className="flex flex-col gap-1 text-xs font-medium text-slate-800 dark:text-white">
              <span>Domain</span>
              <input
                value={selected.site}
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none dark:border-slate-400 dark:bg-white/5 dark:text-white"
                onChange={(e) => setSelectedField('site', e.target.value)}
                placeholder="example.com"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-800 dark:text-white">
              <span>Email / Username</span>
              <input
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none dark:border-slate-400 dark:bg-white/5 dark:text-white"
                value={selected.username}
                onChange={(e) => setSelectedField('username', e.target.value)}
                placeholder="user@example.com"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-slate-800 dark:text-white">
              <span>Password</span>
              <div className="relative">
                <input
                  className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 pr-[60px] text-xs text-slate-800 outline-none dark:border-slate-400 dark:bg-white/5 dark:text-white"
                  type={showPassword ? 'text' : 'password'}
                  value={selected.password}
                  onChange={(e) => setSelectedField('password', e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer border-none bg-none text-[11px] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <label className="flex flex-col gap-1 text-slate-800 dark:text-white">
              <span className="text-xs font-medium">Notes</span>
              <textarea
                className="min-h-[90px] resize-y rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 outline-none dark:border-slate-400 dark:bg-white/5 dark:text-white"
                value={selected.notes ?? ''}
                onChange={(e) => setSelectedField('notes', e.target.value)}
                placeholder="Optional notes…"
              />
            </label>
          </>
        ) : (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Pick a credential from the list or create a new one.
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700">
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selected}
            className="h-[30px] rounded-lg border border-red-200 bg-red-100 px-3 text-xs text-red-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="h-[30px] cursor-pointer rounded-lg border border-slate-300 bg-slate-200 px-3 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="h-[30px] cursor-pointer rounded-lg border border-transparent bg-indigo-600 px-3 text-xs text-white hover:bg-indigo-500"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
