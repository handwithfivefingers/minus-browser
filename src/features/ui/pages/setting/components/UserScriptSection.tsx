import { IconCode, IconDeviceFloppy, IconEdit, IconPlus, IconTrash, IconUpload, IconX } from "@tabler/icons-react";
import clsx from "clsx";
import { ReactNode, useEffect, useRef, useState } from "react";
type UserScriptRunAt = "document-start" | "document-idle" | "document-end";

interface IUserScript {
  id?: string;
  name: string;
  source: string;
  enabled?: boolean;
  matches?: string[];
  runAt?: UserScriptRunAt;
  updatedAt?: number;
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

const UserScriptSection = () => {
  const [scripts, setScripts] = useState<IUserScript[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const formRef = useRef<IUserScript>({
    name: "New Script",
    source: "",
    matches: ["*"],
    runAt: "document-end",
    enabled: false,
  });
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);
  const patchSelected = <K extends keyof IUserScript>({ field, value }: { field: K; value: IUserScript[K] }) => {
    formRef.current[field] = value;
    forceUpdate();
  };
  const loadScripts = async () => {
    const list = await window.api.INVOKE<IUserScript[]>("GET_USERSCRIPTS");
    setScripts(list || []);
  };

  useEffect(() => {
    loadScripts();
  }, []);

  const openCreateModal = () => {
    formRef.current = {
      name: "New Script",
      source: "",
      matches: ["*"],
      runAt: "document-end",
      enabled: false,
    };
    setModalOpen(true);
  };

  const openEditModal = (script: IUserScript) => {
    formRef.current = script;
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
      ...formRef.current,
      name: formRef.current.name.trim() || "New Script",
      matches: formRef.current.matches?.map((item) => item.trim()).filter(Boolean),
    };
    console.log('"SAVE_USERSCRIPT", normalized', normalized);

    // await window.api.INVOKE("SAVE_USERSCRIPT", normalized);
    // setModalOpen(false);
    // loadScripts();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <IconCode size={18} className="text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-900">UserScript Manager</h2>
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
              <div className="text-sm font-medium text-slate-900 truncate">{script.name}</div>
              <div className="text-xs text-slate-500">
                {script.enabled ? "Enabled" : "Disabled"} • Updated{" "}
                {script?.updatedAt && new Date(script?.updatedAt).toLocaleString()}
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
                onClick={() => script?.id && onDeleteScript(script?.id)}
              >
                <IconTrash size={14} />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        title={formRef.current.id ? "Edit Userscript" : "Create Userscript"}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <div className="space-y-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Script Name</span>
            <input
              className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
              value={formRef.current.name}
              onChange={(event) => patchSelected({ field: "name", value: event.target.value })}
              placeholder="New Script"
            />
          </label>

          <div className="space-y-2">
            <FormArray values={formRef.current.matches || []} onUpdate={(v) => (formRef.current.matches = v)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600">Run At</span>
              <select
                className="h-10 px-3 rounded-lg border border-slate-300 text-sm"
                value={formRef.current.runAt}
                onChange={(event) => {
                  patchSelected({
                    field: "runAt",
                    value: event.target.value as UserScriptRunAt,
                  });
                }}
              >
                <option value="document-start">On Start</option>
                <option value="document-idle">On Idle</option>
                <option value="document-end">On Loaded</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm text-slate-600">Status</span>
              <button
                type="button"
                className={clsx(
                  "h-10 rounded-lg border text-sm cursor-pointer",
                  formRef.current.enabled
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-100 text-slate-600 border-slate-300",
                )}
                onClick={() => patchSelected({ field: "enabled", value: !formRef.current.enabled })}
                // onClick={() => setForm((prev) => ({ ...prev, enabled: !prev.enabled }))}
              >
                {formRef.current.enabled ? "ON" : "OFF"}
              </button>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-600">Script Source</span>
            <textarea
              className="min-h-[260px] p-3 rounded-lg border border-slate-300 text-xs font-mono"
              defaultValue={formRef.current.source}
              onChange={(e) => patchSelected({ field: "source", value: e.target.value })}
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

export { UserScriptSection };

const FormArray = ({ values, onUpdate }: { values: string[]; onUpdate: (v: string[]) => void }) => {
  const formArrayValues = useRef<string[]>(values);
  const [, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement[]>([]);
  const forceUpdate = () => setTick((p) => (p += 1));
  const onAddNewField = () => {
    const next = [...formArrayValues.current, ""];
    formArrayValues.current = next;
    forceUpdate();
    setTimeout(() => {
      inputRef.current[next.length - 1].focus();
    }, 250);
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const next = [...formArrayValues.current];
    next[idx] = e.target.value;
    formArrayValues.current = next;
    onUpdate(next);
  };

  const onRemoveField = (idx: number) => {
    const next = [...formArrayValues.current];
    next.splice(idx, 1);
    formArrayValues.current = next;
    onUpdate(next);
    forceUpdate();
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>Match Rules</span>
        <button
          type="button"
          className="h-7 px-2 rounded-md border border-slate-300 text-xs inline-flex items-center gap-1 hover:bg-slate-50 cursor-pointer"
          onClick={onAddNewField}
        >
          <IconPlus size={13} />
          Add Rule
        </button>
      </div>
      {formArrayValues.current?.map((field, idx) => (
        <div key={`${idx}-${field}`} style={{ display: "flex", gap: "6px" }}>
          <input
            defaultValue={field}
            onChange={(e) => onChange(e, idx)}
            ref={(r: HTMLInputElement) => {
              if (r) {
                inputRef.current[idx] = r;
              }
            }}
            style={{
              flex: 1,
              border: "1px solid #cbd5e1",
              borderRadius: "8px",
              padding: "7px",
              fontSize: "12px",
            }}
          />

          <button
            type="button"
            className="h-9 w-9 rounded-md border border-red-200 text-red-600 bg-red-50 inline-flex items-center justify-center hover:bg-red-100 cursor-pointer"
            onClick={() => onRemoveField(idx)}
          >
            <IconTrash size={14} />
          </button>
        </div>
      ))}
    </>
  );
};
