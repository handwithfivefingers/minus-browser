import { IconDeviceFloppy, IconEdit, IconPlus, IconSearch, IconShieldLock, IconTrash, IconX } from "@tabler/icons-react";
import { ReactNode, useEffect, useMemo, useState } from "react";
interface IPasswordVaultItem {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
interface IVaultForm {
  id?: string;
  site: string;
  username: string;
  password: string;
  notes: string;
}

const Modal = ({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/55 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-auto rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <button
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
const VaultSection = () => {
  const [items, setItems] = useState<IPasswordVaultItem[]>([]);
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IVaultForm>({
    site: "",
    username: "",
    password: "",
    notes: "",
  });

  const loadVault = async () => {
    const list = await window.api.INVOKE<IPasswordVaultItem[]>("VAULT_LIST");
    setItems(list || []);
  };

  useEffect(() => {
    loadVault();
  }, []);

  const openCreateModal = () => {
    setForm({ site: "", username: "", password: "", notes: "" });
    setModalOpen(true);
  };

  const openEditModal = (item: IPasswordVaultItem) => {
    setForm({
      id: item.id,
      site: item.site,
      username: item.username,
      password: item.password,
      notes: item.notes || "",
    });
    setModalOpen(true);
  };

  const onSaveVault = async () => {
    if (!form.site.trim() || !form.username.trim() || !form.password.trim()) {
      return;
    }
    if (form.id) {
      await window.api.INVOKE("VAULT_UPDATE", {
        id: form.id,
        patch: {
          site: form.site.trim(),
          username: form.username.trim(),
          password: form.password,
          notes: form.notes,
        },
      });
    } else {
      await window.api.INVOKE("VAULT_ADD", {
        site: form.site.trim(),
        username: form.username.trim(),
        password: form.password,
        notes: form.notes,
      });
    }
    setModalOpen(false);
    loadVault();
  };

  const onDeleteVault = async (id: string) => {
    await window.api.INVOKE("VAULT_DELETE", { id });
    loadVault();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.site.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <IconShieldLock size={18} className="text-slate-700 dark:text-slate-300" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Password Vault</h2>
        </div>
        <button
          type="button"
          className="h-9 px-3 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-200 cursor-pointer"
          onClick={openCreateModal}
        >
          <IconPlus size={15} />
          New Credential
        </button>
      </div>

      <div className="relative mb-3">
        <IconSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <input
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
          placeholder="Search by domain"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">Domain: {item.site}</div>
              <div className="text-xs font-light text-black/80 dark:text-slate-300 truncate">{item.username}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="h-8 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs inline-flex items-center gap-1 hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                onClick={() => openEditModal(item)}
              >
                <IconEdit size={14} />
                Edit
              </button>
              <button
                type="button"
                className="h-8 px-2.5 rounded-md border border-red-200 text-red-600 bg-red-50 text-xs inline-flex items-center gap-1 hover:bg-red-100 cursor-pointer"
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
        title={form.id ? "Edit Credential" : "Create Credential"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Domain</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
              placeholder="example.com"
              value={form.site}
              onChange={(event) => setForm((prev) => ({ ...prev, site: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600 dark:text-slate-400">Email / Username</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
              placeholder="john@company.com"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Password</span>
            <input
              type="password"
              className="h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600 dark:text-slate-400">Notes</span>
            <textarea
              className="min-h-[120px] p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm dark:text-slate-200"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            />
          </label>
        </div>

        <div className="pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm cursor-pointer"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 dark:hover:bg-slate-200 cursor-pointer"
            onClick={onSaveVault}
          >
            <IconDeviceFloppy size={14} />
            Save Credential
          </button>
        </div>
      </Modal>
    </div>
  );
};

export { VaultSection };
