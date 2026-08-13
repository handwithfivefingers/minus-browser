import { IconDeviceFloppy, IconEye, IconEyeOff, IconX } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

import { IPC_INVOKE_CHANNEL } from '~/shared/constants/ipc'
import { SUB_WINDOW_RENDERER_EVENT } from '~/shared/constants/ipc/sub-window'

interface IVaultPendingCredential {
  hostname?: string
  username?: string
  password?: string
  isUpdate?: boolean
  existingId?: string
}

const CaptureBar = () => {
  const [pending, setPending] = useState<IVaultPendingCredential | null>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('subWindowPayload')
    sessionStorage.removeItem('subWindowPayload')
    if (!raw) return
    try {
      const data = JSON.parse(raw) as IVaultPendingCredential
      setPending(data)
      setUsername(data.username || '')
      setPassword(data.password || '')
      setReveal(false)
    } catch {
      /* ignore */
    }
  }, [])

  const close = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE)
  }

  const onSave = async () => {
    if (!pending || saving) return
    setSaving(true)
    try {
      if (pending.isUpdate && pending.existingId) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_UPDATE, {
          id: pending.existingId,
          patch: { password },
        })
      } else {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_ADD, {
          site: pending.hostname,
          username,
          password,
        })
      }
    } catch (error) {
      console.error('vault save error', error)
    } finally {
      setSaving(false)
      close()
    }
  }

  const onNeverSave = async () => {
    if (!pending) return
    try {
      await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_NEVER_SAVE, { hostname: pending.hostname })
    } catch (error) {
      console.error('vault never-save error', error)
    } finally {
      close()
    }
  }

  if (!pending) return null

  return (
    <div
      className="fixed inset-0 z-[9999]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div className="fixed top-14 left-1/2 w-full max-w-lg -translate-x-1/2 px-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {pending.isUpdate ? 'Update saved password for' : 'Save password for'}{' '}
              <span className="text-indigo-600 dark:text-indigo-400">{pending.hostname}</span>
            </div>
            <button
              type="button"
              className="cursor-pointer rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
              onClick={close}
              aria-label="Dismiss"
            >
              <IconX size={16} />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="h-9 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              placeholder="Username / Email"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <div className="relative flex-1">
              <input
                type={reveal ? 'text' : 'password'}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white pr-9 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onSave()
                }}
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                onClick={() => setReveal((v) => !v)}
                aria-label="Toggle password visibility"
              >
                {reveal ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              className="h-8 cursor-pointer rounded-lg border border-slate-300 px-3 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
              onClick={onNeverSave}
            >
              Never save
            </button>
            <button
              type="button"
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-xs text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
              onClick={onSave}
              disabled={saving}
            >
              <IconDeviceFloppy size={14} />
              {saving ? 'Saving…' : pending.isUpdate ? 'Update' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CaptureBar
