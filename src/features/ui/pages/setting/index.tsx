import {
  IconAdjustments,
  IconCode,
  IconDatabase,
  IconDeviceFloppy,
  IconEdit,
  IconLayoutGrid,
  IconPlus,
  IconSearch,
  IconShieldLock,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import clsx from "clsx";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useMinusThemeStore } from "../../stores/useMinusTheme";

type SettingTab = "system" | "userscript" | "vault";
type UserScriptRunAt = "document-start" | "document-idle" | "document-end";

enum LayoutTemplate {
  BASIC = "BASIC",
  FLOATING = "FLOATING",
}

const CLASSES = {
  BASIC: "bg-slate-50 w-full h-full p-6",
  FLOATING: "bg-slate-50 w-full h-full rounded-xl p-6",
};

interface IUserScript {
  id: string;
  name: string;
  source: string;
  matches?: string[];
  runAt?: UserScriptRunAt;
  enabled: boolean;
  updatedAt: number;
}

interface IPasswordVaultItem {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

interface ISystemForm {
  intervalTime: string;
  hardwareAcceleration: string;
  layout: "FLOATING" | "BASIC";
}

interface IUserScriptForm {
  id?: string;
  name: string;
  source: string;
  matches: string[];
  runAt: UserScriptRunAt;
  enabled: boolean;
}

interface IVaultForm {
  id?: string;
  site: string;
  username: string;
  password: string;
  notes: string;
}

const parseUserScriptMeta = (source: string) => {
  const lines = String(source || "").split("\n");
  const meta = {
    name: "New Script",
    matches: ["*://*/*"],
    runAt: "document-end" as UserScriptRunAt,
  };

  for (const line of lines) {
    const nameMatch = line.match(/^\/\/\s*@name\s+(.+)$/);
    const runAtMatch = line.match(/^\/\/\s*@run-at\s+(.+)$/);
    const matchRule = line.match(/^\/\/\s*@match\s+(.+)$/);
    if (nameMatch?.[1]) meta.name = nameMatch[1].trim();
    if (runAtMatch?.[1]) {
      const value = runAtMatch[1].trim() as UserScriptRunAt;
      if (
        value === "document-start" ||
        value === "document-idle" ||
        value === "document-end"
      ) {
        meta.runAt = value;
      }
    }
    if (matchRule?.[1]) {
      if (meta.matches.length === 1 && meta.matches[0] === "*://*/*") {
        meta.matches = [];
      }
      meta.matches.push(matchRule[1].trim());
    }
  }

  if (!meta.matches.length) meta.matches = ["*://*/*"];
  return meta;
};

const buildUserScriptSource = (sourceBody: string, form: IUserScriptForm) => {
  const src = String(sourceBody || "");
  const blockRegex = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\n?/m;
  const cleanMatches = form.matches.map((m) => m.trim()).filter(Boolean);
  const matchLines = (cleanMatches.length ? cleanMatches : ["*://*/*"])
    .map((match) => `// @match ${match}`)
    .join("\n");

  const block =
    "// ==UserScript==\n" +
    `// @name ${form.name || "New Script"}\n` +
    `${matchLines}\n` +
    `// @run-at ${form.runAt}\n` +
    "// ==/UserScript==\n";

  if (blockRegex.test(src)) {
    return src.replace(blockRegex, block);
  }
  return `${block}\n${src}`;
};

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
    <div
      className="fixed inset-0 z-[2000] bg-slate-900/55 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[88vh] overflow-auto rounded-xl bg-white border border-slate-200 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="font-semibold text-slate-900">{title}</div>
          <button
            className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
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

const Sidebar = ({
  active,
  onChange,
}: {
  active: SettingTab;
  onChange: (tab: SettingTab) => void;
}) => {
  const tabs: Array<{ id: SettingTab; label: string; icon: React.ReactNode }> =
    [
      { id: "system", label: "System", icon: <IconAdjustments size={16} /> },
      { id: "userscript", label: "UserScript", icon: <IconCode size={16} /> },
      {
        id: "vault",
        label: "Password Vault",
        icon: <IconShieldLock size={16} />,
      },
    ];

  return (
    <aside className="w-[230px] shrink-0 bg-white rounded-xl border border-slate-200 p-3">
      <div className="px-2 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        Settings
      </div>
      <div className="flex flex-col gap-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={clsx(
              "w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 text-sm cursor-pointer border",
              active === tab.id
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

const SystemSection = ({
  form,
  setForm,
  onSave,
}: {
  form: ISystemForm;
  setForm: Dispatch<SetStateAction<ISystemForm>>;
  onSave: () => void;
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <IconDatabase size={18} className="text-slate-700" />
        <h2 className="text-lg font-semibold text-slate-900">
          System Preferences
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Sync Data Interval</span>
          <select
            value={form.intervalTime}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, intervalTime: event.target.value }))
            }
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="15">15 sec</option>
            <option value="30">30 sec</option>
            <option value="45">45 sec</option>
            <option value="60">60 sec</option>
            <option value="off">Off</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm text-slate-600">Hardware Acceleration</span>
          <select
            value={form.hardwareAcceleration}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                hardwareAcceleration: event.target.value,
              }))
            }
            className="h-10 px-3 rounded-lg border border-slate-300 bg-white text-sm"
          >
            <option value="0">Off</option>
            <option value="1">On</option>
          </select>
        </label>

        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className="text-sm text-slate-600">Layout Template</span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              type="button"
              className={clsx(
                "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                form.layout === LayoutTemplate.BASIC
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
              )}
              onClick={() =>
                setForm((prev) => ({ ...prev, layout: LayoutTemplate.BASIC }))
              }
            >
              <IconLayoutGrid size={16} />
              BASIC
            </button>
            <button
              type="button"
              className={clsx(
                "h-11 px-3 rounded-lg border text-sm inline-flex items-center justify-center gap-2 cursor-pointer",
                form.layout === LayoutTemplate.FLOATING
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50",
              )}
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  layout: LayoutTemplate.FLOATING,
                }))
              }
            >
              <IconLayoutGrid size={16} />
              FLOATING
            </button>
          </div>
        </label>
      </div>

      <div className="pt-5">
        <button
          type="button"
          onClick={onSave}
          className="h-10 px-4 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-2 hover:bg-slate-700 cursor-pointer"
        >
          <IconDeviceFloppy size={16} />
          Save System Settings
        </button>
      </div>
    </div>
  );
};

const UserScriptSection = () => {
  const [scripts, setScripts] = useState<IUserScript[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<IUserScriptForm>({
    name: "New Script",
    source:
      "// ==UserScript==\n// @name New Script\n// @match *://*/*\n// @run-at document-end\n// ==/UserScript==\n",
    matches: ["*://*/*"],
    runAt: "document-end",
    enabled: false,
  });

  const loadScripts = async () => {
    const list = await window.api.INVOKE<IUserScript[]>("GET_USERSCRIPTS");
    setScripts(list || []);
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const openCreateModal = () => {
    setForm({
      name: "New Script",
      source:
        "// ==UserScript==\n// @name New Script\n// @match *://*/*\n// @run-at document-end\n// ==/UserScript==\n",
      matches: ["*://*/*"],
      runAt: "document-end",
      enabled: false,
    });
    setModalOpen(true);
  };

  const openEditModal = (script: IUserScript) => {
    const parsed = parseUserScriptMeta(script.source);
    setForm({
      id: script.id,
      name: script.name || parsed.name,
      source: script.source,
      matches: script.matches?.length ? script.matches : parsed.matches,
      runAt: script.runAt || parsed.runAt,
      enabled: script.enabled,
    });
    setModalOpen(true);
  };

  const onImportScript = async () => {
    await window.api.INVOKE("IMPORT_USERSCRIPT");
    loadScripts();
  };

  const onDeleteScript = async (id: string) => {
    await window.api.INVOKE("DELETE_USERSCRIPT", { id });
    loadScripts();
  };

  const onSaveScript = async () => {
    const normalized = {
      ...form,
      name: form.name.trim() || "New Script",
      matches: form.matches.map((item) => item.trim()).filter(Boolean),
    };

    const withMeta = buildUserScriptSource(normalized.source, normalized);
    await window.api.INVOKE("SAVE_USERSCRIPT", {
      id: normalized.id,
      source: withMeta,
      enabled: normalized.enabled,
    });
    setModalOpen(false);
    loadScripts();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <IconCode size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            UserScript Manager
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm inline-flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer"
            onClick={onImportScript}
          >
            <IconUpload size={15} />
            Import
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
            onClick={openCreateModal}
          >
            <IconPlus size={15} />
            New Script
          </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                {script.name}
              </div>
              <div className="text-xs text-slate-500">
                {script.enabled ? "Enabled" : "Disabled"} • Updated{" "}
                {new Date(script.updatedAt).toLocaleString()}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="h-8 px-2.5 rounded-md border border-slate-300 text-slate-700 text-xs inline-flex items-center gap-1 hover:bg-white cursor-pointer"
                onClick={() => openEditModal(script)}
              >
                <IconEdit size={14} />
                Edit
              </button>
              <button
                type="button"
                className="h-8 px-2.5 rounded-md border border-red-200 text-red-600 bg-red-50 text-xs inline-flex items-center gap-1 hover:bg-red-100 cursor-pointer"
                onClick={() => onDeleteScript(script.id)}
              >
                <IconTrash size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title={form.id ? "Edit Userscript" : "Create Userscript"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Script Name</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="New Script"
            />
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">Match Rules</span>
              <button
                type="button"
                className="h-7 px-2 rounded-md border border-slate-300 text-xs inline-flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    matches: [...prev.matches, ""],
                  }))
                }
              >
                <IconPlus size={13} />
                Add Rule
              </button>
            </div>
            <div className="space-y-2">
              {form.matches.map((match, index) => (
                <div
                  key={`${index}-${match}`}
                  className="flex items-center gap-2"
                >
                  <input
                    className="h-9 px-3 rounded-lg border border-slate-300 text-sm flex-1"
                    value={match}
                    placeholder="*://*/*"
                    onChange={(event) => {
                      const next = [...form.matches];
                      next[index] = event.target.value;
                      setForm((prev) => ({ ...prev, matches: next }));
                    }}
                  />
                  <button
                    type="button"
                    className="h-9 w-9 rounded-md border border-red-200 text-red-600 bg-red-50 inline-flex items-center justify-center hover:bg-red-100 cursor-pointer"
                    onClick={() => {
                      const next = form.matches.filter(
                        (_, idx) => idx !== index,
                      );
                      setForm((prev) => ({
                        ...prev,
                        matches: next.length ? next : ["*://*/*"],
                      }));
                    }}
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600">Run At</span>
              <select
                className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                value={form.runAt}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    runAt: event.target.value as UserScriptRunAt,
                  }))
                }
              >
                <option value="document-start">document-start</option>
                <option value="document-idle">document-idle</option>
                <option value="document-end">document-end</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600">Status</span>
              <button
                type="button"
                className={clsx(
                  "h-10 rounded-lg border text-sm cursor-pointer",
                  form.enabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-300",
                )}
                onClick={() =>
                  setForm((prev) => ({ ...prev, enabled: !prev.enabled }))
                }
              >
                {form.enabled ? "ON" : "OFF"}
              </button>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Script Source</span>
            <textarea
              className="min-h-[260px] p-3 rounded-lg border border-slate-300 text-xs font-mono"
              value={form.source}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, source: event.target.value }))
              }
            />
          </label>

          <div className="pt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              className="h-9 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm cursor-pointer"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
              onClick={onSaveScript}
            >
              <IconDeviceFloppy size={14} />
              Save Script
            </button>
          </div>
        </div>
      </Modal>
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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <IconShieldLock size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">
            Password Vault
          </h2>
        </div>
        <button
          type="button"
          className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
          onClick={openCreateModal}
        >
          <IconPlus size={15} />
          New Credential
        </button>
      </div>

      <div className="relative mb-3">
        <IconSearch
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          className="w-full h-10 pl-9 pr-3 rounded-lg border border-slate-300 text-sm"
          placeholder="Search by domain"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-[460px] overflow-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 truncate">
                Domain: {item.site}
              </div>
              <div className="text-xs font-light text-black/80 truncate">
                {item.username}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                className="h-8 px-2.5 rounded-md border border-slate-300 text-slate-700 text-xs inline-flex items-center gap-1 hover:bg-white cursor-pointer"
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
            <span className="text-sm text-slate-600">Domain</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
              placeholder="example.com"
              value={form.site}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, site: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Email / Username</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
              placeholder="john@company.com"
              value={form.username}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600">Password</span>
            <input
              type="password"
              className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-sm text-slate-600">Notes</span>
            <textarea
              className="min-h-[120px] p-3 rounded-lg border border-slate-300 text-sm"
              value={form.notes}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, notes: event.target.value }))
              }
            />
          </label>
        </div>

        <div className="pt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            className="h-9 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm cursor-pointer"
            onClick={() => setModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-9 px-3 rounded-lg bg-slate-900 text-white text-sm inline-flex items-center gap-1.5 hover:bg-slate-700 cursor-pointer"
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

const Setting = () => {
  const { layout, mode, initialize } = useMinusThemeStore();
  const [activeTab, setActiveTab] = useState<SettingTab>("system");
  const [systemForm, setSystemForm] = useState<ISystemForm>({
    intervalTime: "15",
    hardwareAcceleration: "0",
    layout,
  });

  const saveSystem = () => {
    const data = {
      layout: systemForm.layout,
      mode,
      dataSync: {
        intervalTime: systemForm.intervalTime,
        hardwareAcceleration: systemForm.hardwareAcceleration,
      },
    };
    window.api.INVOKE("INTERFACE_SAVE", data);
    initialize(data);
  };

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout]}>
        <div className="h-full rounded-xl border border-slate-200 bg-slate-100 p-3 md:p-4 flex gap-3 overflow-hidden">
          <Sidebar active={activeTab} onChange={setActiveTab} />

          <main className="flex-1 min-w-0 overflow-auto">
            {activeTab === "system" && (
              <SystemSection
                form={systemForm}
                setForm={setSystemForm}
                onSave={saveSystem}
              />
            )}
            {activeTab === "userscript" && <UserScriptSection />}
            {activeTab === "vault" && <VaultSection />}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Setting;
