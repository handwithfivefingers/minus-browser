import clsx from "clsx";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";

interface Props {
  values: ScriptItem;
}

interface FormRef {
  getValues: () => ScriptItem;
}

interface ButtonProps {
  onClick: () => void;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

type ScriptItem = {
  id: string;
  name: string;
  source: string;
  matches?: string[];
  runAt?: "document-start" | "document-end" | "document-idle";
  enabled?: boolean;
};

export const Form = forwardRef<FormRef, Props>((props, ref) => {
  const formData = useRef<ScriptItem>({ ...props.values });
  const [, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);
  const patchSelected = <K extends keyof ScriptItem>({ field, value }: { field: K; value: ScriptItem[K] }) => {
    formData.current[field] = value;
    forceUpdate();
  };

  useEffect(() => {
    if (props.values.id) {
      formData.current = props.values;
      forceUpdate();
    }
  }, [props.values.id]);

  useImperativeHandle(ref, () => {
    return {
      getValues: () => formData.current,
    };
  }, []);

  return (
    <form
      name="user-script"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      <input
        className="text-white bg-white/5 rounded-md border border-slate-400"
        defaultValue={formData.current.name}
        onChange={(e) => patchSelected({ field: "name", value: e.target.value })}
        placeholder="Script name"
        style={{
          // border: "1px solid #cbd5e1",
          // borderRadius: "8px",
          padding: "8px",
          fontSize: "12px",
        }}
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <FormArray values={formData.current.matches || ["*"]} onUpdate={(v) => (formData.current.matches = v)} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: "8px",
        }}
      >
        <select
          // className="text-white bg-white/5"
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={formData.current.runAt}
          onChange={(e) =>
            patchSelected({
              field: "runAt",
              value: e.target.value as ScriptItem["runAt"],
            })
          }
          style={{
            // border: "1px solid #cbd5e1",
            // borderRadius: "8px",
            padding: "8px",
            fontSize: "12px",
          }}
        >
          <option value="document-start">On Start</option>
          <option value="document-idle">On Idle</option>
          <option value="document-end">On Loaded</option>
        </select>

        <button
          type="button"
          className="border border-slate-600 bg-[#0f172a] text-white hover:bg-slate-600 transition-colors"
          onClick={() => patchSelected({ field: "enabled", value: !formData.current.enabled })}
          style={{
            padding: "4px 16px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "12px",
          }}
        >
          {formData.current.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <textarea
        className="text-white bg-white/5 rounded-md border border-slate-400"
        value={formData.current.source || ""}
        onChange={(e) => patchSelected({ field: "source", value: e.target.value })}
        style={{
          flex: 1,
          minHeight: "330px",
          // border: "1px solid #cbd5e1",
          // borderRadius: "8px",
          padding: "8px",
          fontSize: "12px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      />
    </form>
  );
});

export const Button = ({ onClick, children, style }: ButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: "30px",
        padding: "0 10px",
        borderRadius: "8px",
        border: "1px solid transparent",
        background: "#0f172a",
        color: "#fff",
        cursor: "pointer",
        marginBottom: "8px",
        ...style,
      }}
    >
      {children}
    </button>
  );
};

const FormArray = ({ values, onUpdate }: { values: string[]; onUpdate?: (v: string[]) => void }) => {
  const formArrayValues = useRef<string[]>(values);
  const [, setTick] = useState(0);
  const inputRef = useRef<HTMLInputElement[]>([]);
  const forceUpdate = () => setTick((p) => (p += 1));
  const onAddNewField = () => {
    const next = [...formArrayValues.current, ""];
    formArrayValues.current = next;
    inputRef.current[next.length - 1].focus();
    forceUpdate();
  };
  const onChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const next = [...formArrayValues.current];
    next[idx] = e.target.value;
    formArrayValues.current = next;
    onUpdate?.(next);
  };

  const onRemoveField = (idx: number) => {
    const next = [...formArrayValues.current];
    next.splice(idx, 1);
    formArrayValues.current = next;
    onUpdate?.(next);
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
        <span className="text-white text-sm">Match Rules</span>
        <button
          type="button"
          onClick={onAddNewField}
          className="px-2 py-1 text-sm cursor-pointer bg-white text-slate-800 rounded"
        >
          New Rules
        </button>
      </div>
      {formArrayValues.current?.map((field, idx) => (
        <div key={`${idx}-${field}`} style={{ display: "flex", gap: "6px" }}>
          <input
            className="text-white bg-white/5 rounded-md border border-slate-400"
            defaultValue={field}
            onChange={(e) => onChange(e, idx)}
            ref={(r: HTMLInputElement) => {
              if (r) {
                inputRef.current[idx] = r;
              }
            }}
            style={{
              // border: "1px solid #cbd5e1",
              // borderRadius: "8px",
              padding: "6px",
              fontSize: "12px",
              width: "100%",
              outline: "none",
            }}
          />

          <button
            type="button"
            className="border border-slate-600 bg-[#0f172a] text-white hover:bg-slate-600 transition-colors"
            onClick={() => onRemoveField(idx)}
            style={{
              padding: "4px 16px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            -
          </button>
        </div>
      ))}
    </>
  );
};

const App = () => {
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [openState, setOpenState] = useState(false);
  const formRef = useRef<{ getValues: () => ScriptItem }>(null);

  const originalIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const nextItems: ScriptItem[] = Array.isArray(data.items) ? data.items.map((item: any) => ({ ...item })) : [];
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setOpenState(true);
        originalIdsRef.current = new Set(nextItems.map((i) => i.id));
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState]);

  const handleSave = async () => {
    const currentIds = new Set(items.map((i) => i.id));
    for (const originalId of originalIdsRef.current) {
      if (!currentIds.has(originalId)) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.DELETE_USERSCRIPT, originalId);
      }
    }
    for (const script of items) {
      if (script?.id) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.SAVE_USERSCRIPT, script);
      }
    }
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const handleCancel = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);
  if (!openState) return <div style={{ display: "none" }} />;

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`;
    const item: ScriptItem = {
      id,
      name: "New Script",
      source: "",
      runAt: "document-end",
      matches: ["*"],
      enabled: false,
    };
    setItems((prev) => [item, ...prev]);
    setSelectedId(id);
  };

  const applySelected = () => {
    if (!selected) return;
    const formData = formRef.current?.getValues() as ScriptItem;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== selected.id) return it;
        formData.matches = (formData.matches || ["*://*/*"]).map((m) => m.trim()).filter(Boolean);
        return formData;
      }),
    );
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = items.filter((it) => it.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id || null);
  };

  return (
    <div
      className="w-200 h-[80vh] overflow-hidden rounded grid"
      style={{
        gridTemplateColumns: "300px 1fr",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          borderRight: "1px solid #e2e8f0",
          padding: "12px",
          overflow: "auto",
        }}
        className="flex flex-col gap-2"
      >
        <div>
          <button
            type="button"
            className="border border-slate-600 bg-[#0f172a] text-white hover:bg-slate-600 transition-colors"
            onClick={createNew}
            style={{
              height: "28px",
              padding: "0 10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            + New
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              style={{
                // border: "1px solid #e2e8f0",
                borderRadius: "8px",
                // background: selectedId === item.id ? "#e2e8f0" : "#fff",
                textAlign: "left",
                padding: "8px",
                cursor: "pointer",
              }}
              className={clsx("border border-white/50", {
                ["bg-slate-800 text-white"]: selectedId === item.id,
                ["bg-white text-slate-800"]: selectedId !== item.id,
              })}
            >
              <div
                style={{
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {item.name || "Unnamed Script"}
              </div>
              <div style={{ marginTop: "2px", color: "#475569" }}>
                {item.enabled ? "ON" : "OFF"} • {item.runAt || "document-end"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div className="font-medium text-white">Edit Script</div>
        </div>

        {selected ? <Form values={selected} ref={formRef} /> : null}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button
            type="button"
            onClick={removeSelected}
            style={{
              // height: "30px",
              fontSize: 12,
              padding: "4px 8px",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                background: "#e2e8f0",
                color: "#334155",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                applySelected();
              }}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid transparent",
                borderRadius: "8px",
                background: "#0f172a",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                applySelected();
                setTimeout(handleSave, 0);
              }}
              style={{
                fontSize: 12,
                padding: "4px 8px",
                border: "1px solid transparent",
                borderRadius: "8px",
                background: "#4f46e5",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
