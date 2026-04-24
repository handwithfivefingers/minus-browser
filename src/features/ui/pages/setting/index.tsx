import { IconTable, IconTableFilled } from "@tabler/icons-react";
import clsx from "clsx";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMinusThemeStore } from "../../stores/useMinusTheme";
enum LayoutTemplate {
  BASIC = "BASIC",
  FLOATING = "FLOATING",
}

const CLASSES = {
  BASIC: "bg-slate-100 w-full h-full p-8",
  FLOATING: "bg-slate-100 w-full h-full rounded-lg p-8",
};
const Setting = () => {
  const { layout, mode, initialize } = useMinusThemeStore();
  const tempRef = useRef(null);
  const dataAdjRef = useRef(null);
  const save = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const template = tempRef.current.get();
    const dataSync = dataAdjRef.current.get();
    const data = { layout: template, mode, dataSync: { ...dataSync } };
    window.api.INVOKE("INTERFACE_SAVE", data);
    initialize(data);
  };

  return (
    <div className="relative bg-slate-800 h-full w-full">
      <div className={CLASSES[layout]}>
        <h1 className="font-bold text-xl py-4">Setting</h1>
        <div className="flex gap-2">
          <DataAdjustment ref={dataAdjRef} />
          <FontAdjustment />
          <Template ref={tempRef} />
        </div>
        <UserScriptSetting />
        <PasswordManagementSetting />

        <button
          className="px-2 py-2 rounded-md bg-indigo-500 text-white my-2 active:translate-y-0.5 cursor-pointer"
          onClick={save}
        >
          Save Setting
        </button>
      </div>
    </div>
  );
};

const DataAdjustment = forwardRef<{ get: () => { intervalTime: string } }>((props, ref) => {
  const [dataAdj, setDataAdj] = useState({
    intervalTime: "15",
    hardwareAcceleration: "0",
  });
  useImperativeHandle(ref, () => ({
    get: () => dataAdj,
  }));
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">System:</span>
      <div className="flex w-full justify-between gap-2">
        <div>Sync data interval:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={dataAdj.intervalTime}
          onChange={(e) => setDataAdj((prev) => ({ ...prev, intervalTime: e.target.value }))}
        >
          <option value={"15"}>15 Sec</option>
          <option value={"30"}>30 Sec</option>
          <option value={"45"}>45 Sec</option>
          <option value={"60"}>60 Sec</option>
          <option value={"off"}>Off</option>
        </select>
      </div>
      <div className="flex w-full justify-between gap-2">
        <div>Hardware acceleration:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={dataAdj.hardwareAcceleration}
          onChange={(e) => setDataAdj((prev) => ({ ...prev, hardwareAcceleration: e.target.value }))}
        >
          <option value={"0"}>Off</option>
          <option value={"1"}>On</option>
        </select>
      </div>
    </div>
  );
});

const FontAdjustment = forwardRef((props, ref) => {
  const [fontAdj, setFontAdj] = useState({
    fontSize: "10",
  });
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Font Adjustment:</span>
      <div className="flex w-full justify-between gap-2">
        <div>Font Size:</div>
        <select
          className="bg-slate-300 rounded px-2 w-24"
          value={fontAdj.fontSize}
          onChange={(e) => setFontAdj((prev) => ({ ...prev, fontSize: e.target.value }))}
        >
          <option value={"8"}>8</option>
          <option value={"12"}>12</option>
          <option value={"16"}>16</option>
          <option value={"20"}>20</option>
        </select>
      </div>
      <div className="flex w-full justify-between gap-2">
        <div>Font Family:</div>
        <select className="bg-slate-300 rounded px-2 w-24">
          <option value={"mono"}>Mono</option>
        </select>
      </div>
    </div>
  );
});
const Template = forwardRef<{ get: () => "BASIC" | "FLOATING" }>((props, ref) => {
  const { layout } = useMinusThemeStore();
  const [layoutTemplate, setLayoutTemplate] = useState<"BASIC" | "FLOATING">(layout);
  useImperativeHandle(ref, () => ({
    get: () => layoutTemplate,
  }));
  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col">
      <span className="font-bold text-lg">Layout:</span>
      <div className="flex gap-2 w-full justify-between flex-col">
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layoutTemplate === LayoutTemplate.BASIC,
          })}
          onClick={() => setLayoutTemplate(LayoutTemplate.BASIC)}
        >
          <IconTable />
          <span>{LayoutTemplate.BASIC}</span>
        </div>
        <div
          className={clsx("flex gap-2 border rounded bg-slate-100 border-slate-200 p-2 cursor-pointer", {
            ["!bg-indigo-500 text-white"]: layoutTemplate === LayoutTemplate.FLOATING,
          })}
          onClick={() => setLayoutTemplate(LayoutTemplate.FLOATING)}
        >
          <IconTableFilled />
          <span>{LayoutTemplate.FLOATING}</span>
        </div>
      </div>
    </div>
  );
});

interface IUserScript {
  id: string;
  name: string;
  source: string;
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

const UserScriptSetting = () => {
  const [scripts, setScripts] = useState<IUserScript[]>([]);
  const [source, setSource] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  const loadScripts = async () => {
    const list = await window.api.INVOKE<IUserScript[]>("GET_USERSCRIPTS");
    setScripts(list || []);
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const onSaveScript = async () => {
    if (!source.trim()) return;
    await window.api.INVOKE("SAVE_USERSCRIPT", {
      id: selectedId,
      source,
      enabled,
    });
    setSelectedId(null);
    setSource("");
    setEnabled(false);
    loadScripts();
  };

  const onImportScript = async () => {
    await window.api.INVOKE("IMPORT_USERSCRIPT");
    loadScripts();
  };

  const onDeleteScript = async (id: string) => {
    await window.api.INVOKE("DELETE_USERSCRIPT", { id });
    if (selectedId === id) {
      setSelectedId(null);
      setSource("");
      setEnabled(false);
    }
    loadScripts();
  };

  const onToggleScript = async (id: string, nextState: boolean) => {
    await window.api.INVOKE("TOGGLE_USERSCRIPT", {
      id,
      enabled: nextState,
    });
    loadScripts();
  };

  const onSelectScript = (script: IUserScript) => {
    setSelectedId(script.id);
    setSource(script.source);
    setEnabled(script.enabled);
  };

  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col mt-3">
      <span className="font-bold text-lg">Userscripts (Tampermonkey Lite):</span>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 rounded bg-indigo-500 text-white cursor-pointer"
          onClick={onImportScript}
        >
          Import .js/.user.js
        </button>
        <button
          className="px-2 py-1 rounded bg-green-600 text-white cursor-pointer"
          onClick={onSaveScript}
        >
          {selectedId ? "Update Script" : "Save Script"}
        </button>
      </div>
      <label className="text-sm flex gap-2 items-center">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        Enabled
      </label>
      <textarea
        className="bg-white rounded p-2 min-h-[140px] text-xs"
        value={source}
        placeholder="Paste custom userscript here..."
        onChange={(event) => setSource(event.target.value)}
      />
      <div className="max-h-44 overflow-auto flex flex-col gap-1">
        {scripts.map((script) => (
          <div
            key={script.id}
            className="bg-white rounded p-2 text-xs flex items-center justify-between gap-2"
          >
            <button
              className="text-left flex-1 cursor-pointer"
              onClick={() => onSelectScript(script)}
              title={script.name}
            >
              <div className="font-semibold truncate">{script.name}</div>
              <div className="text-slate-500">
                {new Date(script.updatedAt).toLocaleString()}
              </div>
            </button>
            <button
              className="px-2 py-1 rounded bg-slate-200 cursor-pointer"
              onClick={() => onToggleScript(script.id, !script.enabled)}
            >
              {script.enabled ? "Disable" : "Enable"}
            </button>
            <button
              className="px-2 py-1 rounded bg-red-100 text-red-600 cursor-pointer"
              onClick={() => onDeleteScript(script.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const PasswordManagementSetting = () => {
  const [items, setItems] = useState<IPasswordVaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({
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

  const resetForm = () => {
    setSelectedId(null);
    setForm({
      site: "",
      username: "",
      password: "",
      notes: "",
    });
  };

  const onSave = async () => {
    if (!form.site.trim() || !form.username.trim() || !form.password.trim()) {
      return;
    }
    if (selectedId) {
      await window.api.INVOKE("VAULT_UPDATE", {
        id: selectedId,
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
    resetForm();
    loadVault();
  };

  const onEdit = (item: IPasswordVaultItem) => {
    setSelectedId(item.id);
    setForm({
      site: item.site,
      username: item.username,
      password: item.password,
      notes: item.notes || "",
    });
  };

  const onDelete = async (id: string) => {
    await window.api.INVOKE("VAULT_DELETE", { id });
    if (selectedId === id) {
      resetForm();
    }
    loadVault();
  };

  return (
    <div className="bg-slate-200 p-4 rounded-lg flex gap-2 flex-col mt-3">
      <span className="font-bold text-lg">Password Manager:</span>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="bg-white rounded px-2 py-1 text-sm"
          placeholder="Site (example.com)"
          value={form.site}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, site: event.target.value }))
          }
        />
        <input
          className="bg-white rounded px-2 py-1 text-sm"
          placeholder="Username / Email"
          value={form.username}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, username: event.target.value }))
          }
        />
        <input
          className="bg-white rounded px-2 py-1 text-sm"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, password: event.target.value }))
          }
        />
        <input
          className="bg-white rounded px-2 py-1 text-sm"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, notes: event.target.value }))
          }
        />
      </div>
      <div className="flex gap-2">
        <button
          className="px-2 py-1 rounded bg-green-600 text-white cursor-pointer"
          onClick={onSave}
        >
          {selectedId ? "Update Credential" : "Save Credential"}
        </button>
        <button
          className="px-2 py-1 rounded bg-slate-400 text-white cursor-pointer"
          onClick={resetForm}
        >
          Clear
        </button>
      </div>
      <div className="max-h-56 overflow-auto flex flex-col gap-1">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded p-2 text-xs flex items-center justify-between gap-2"
          >
            <button
              className="text-left flex-1 cursor-pointer"
              onClick={() => onEdit(item)}
              title={`${item.site} - ${item.username}`}
            >
              <div className="font-semibold truncate">
                {item.site} - {item.username}
              </div>
              <div className="text-slate-500">
                Updated: {new Date(item.updatedAt).toLocaleString()}
              </div>
            </button>
            <button
              className="px-2 py-1 rounded bg-slate-200 cursor-pointer"
              onClick={() => onEdit(item)}
            >
              Edit
            </button>
            <button
              className="px-2 py-1 rounded bg-red-100 text-red-600 cursor-pointer"
              onClick={() => onDelete(item.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Setting;
