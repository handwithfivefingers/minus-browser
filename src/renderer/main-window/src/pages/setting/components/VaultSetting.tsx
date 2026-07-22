import { IconDeviceFloppy, IconEdit, IconPlus, IconSearch, IconShieldLock, IconTrash, IconX } from '@tabler/icons-react'
import { ReactNode, useEffect, useMemo, useState } from 'react'
interface IPasswordVaultItem {
  id: string
  site: string
  username: string
  password: string
  notes?: string
  createdAt: number
  updatedAt: number
}
interface IVaultForm {
  id?: string
  site: string
  username: string
  password: string
  notes: string
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
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/55 p-4"
      onClick={onClose}
      aria-hidden
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
        onClick={(event) => event.stopPropagation()}
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
const VaultSection = () => {
  const [items, setItems] = useState<IPasswordVaultItem[]>([])
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<IVaultForm>({
    site: '',
    username: '',
    password: '',
    notes: '',
  })

  const loadVault = async () => {
    const list = await window.api.INVOKE<IPasswordVaultItem[]>('VAULT_LIST')
    setItems(list || [])
  }

  useEffect(() => {
    loadVault()
  }, [])

  const openCreateModal = () => {
    setForm({ site: '', username: '', password: '', notes: '' })
    setModalOpen(true)
  }

  const openEditModal = (item: IPasswordVaultItem) => {
    setForm({
      id: item.id,
      site: item.site,
      username: item.username,
      password: item.password,
      notes: item.notes || '',
    })
    setModalOpen(true)
  }

  const onSaveVault = async () => {
    if (!form.site.trim() || !form.username.trim() || !form.password.trim()) {
      return
    }
    if (form.id) {
      await window.api.INVOKE('VAULT_UPDATE', {
        id: form.id,
        patch: {
          site: form.site.trim(),
          username: form.username.trim(),
          password: form.password,
          notes: form.notes,
        },
      })
    } else {
      await window.api.INVOKE('VAULT_ADD', {
        site: form.site.trim(),
        username: form.username.trim(),
        password: form.password,
        notes: form.notes,
      })
    }
    setModalOpen(false)
    loadVault()
  }

  const onDeleteVault = async (id: string) => {
    await window.api.INVOKE('VAULT_DELETE', { id })
    loadVault()
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.site.toLowerCase().includes(q))
  }, [items, query])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconShieldLock size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Password Vault</h2>
        </div>
        <button
          type="button"
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-slate-900 px-3 text-sm text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          onClick={openCreateModal}
        >
          <IconPlus size={15} />
          New Credential
        </button>
      </div>

      <div className="relative mb-3">
        <IconSearch size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          className="h-10 w-full rounded-lg border border-slate-300 bg-white pr-3 pl-9 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
          placeholder="Search by domain"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="max-h-[460px] space-y-2 overflow-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-800/50"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">Domain: {item.site}</div>
              <div className="truncate text-xs font-light text-black/80 dark:text-slate-300">{item.username}</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-300 px-2.5 text-xs text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => openEditModal(item)}
              >
                <IconEdit size={14} />
                Edit
              </button>
              <button
                type="button"
                className="inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2.5 text-xs text-red-600 hover:bg-red-100"
                onClick={() => onDeleteVault(item.id)}
              >
                <IconTrash size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title={form.id ? 'Edit Credential' : 'Create Credential'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Domain</span>
            <input
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              placeholder="example.com"
              value={form.site}
              onChange={(event) => setForm((prev) => ({ ...prev, site: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Email / Username</span>
            <input
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              placeholder="john@company.com"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Password</span>
            <input
              type="password"
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Notes</span>
            <textarea
              className="min-h-[120px] rounded-lg border border-slate-300 bg-white p-3 text-sm dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
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
            onClick={onSaveVault}
          >
            <IconDeviceFloppy size={14} />
            Save Credential
          </button>
        </div>
      </Modal>
    </div>
  )
}

export { VaultSection }
