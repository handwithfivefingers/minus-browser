// import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
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
declare global {
  interface Window {
    __userScriptReady?: boolean;
    __userScriptClose?: () => void;
  }
}
type OpenPayload = { requestId: string; items: ScriptItem[] };
const RESOLVE_SENTINEL = "__USER_SCRIPT_RESOLVE__:";

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
        defaultValue={formData.current.name}
        onChange={(e) => patchSelected({ field: "name", value: e.target.value })}
        placeholder="Script name"
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
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
          value={formData.current.runAt}
          onChange={(e) =>
            patchSelected({
              field: "runAt",
              value: e.target.value as ScriptItem["runAt"],
            })
          }
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
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
          onClick={() => patchSelected({ field: "enabled", value: !formData.current.enabled })}
          style={{
            minWidth: "66px",
            border: "1px solid transparent",
            borderRadius: "8px",
            padding: "0 10px",
            background: formData.current.enabled ? "#16a34a" : "#334155",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {formData.current.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <textarea
        value={formData.current.source || ""}
        onChange={(e) => patchSelected({ field: "source", value: e.target.value })}
        style={{
          flex: 1,
          minHeight: "330px",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
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
  // const [formArrayValues, setFormArrayValues] = useState(values);

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
        <span>Match Rules</span>
        <button
          type="button"
          onClick={onAddNewField}
          style={{
            height: "26px",
            padding: "0 8px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          New Rules
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
            onClick={() => onRemoveField(idx)}
            style={{
              width: "30px",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              background: "#fee2e2",
              color: "#b91c1c",
              cursor: "pointer",
            }}
          >
            -
          </button>
        </div>
      ))}
    </>
  );
};

const sendResolve = (requestId: string, payload: ScriptItem[] | null) => {
  // Signal to the main process via console-message bridge.
  console.log(RESOLVE_SENTINEL + JSON.stringify({ requestId, payload }));
};

const App = () => {
  const [openState, setOpenState] = useState<OpenPayload | null>(null);
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const formRef = useRef<{ getValues: () => ScriptItem }>(null);
  useEffect(() => {
    window.__userScriptReady = true;
    // __vaultClose is called by the main process (fire-and-forget
    // executeJavaScript) when the dialog is resolving. It triggers the
    // CSS fade-out so the view looks smooth before being removed.
    window.__userScriptClose = () => {
      document.documentElement.style.opacity = "0";
    };
    return () => {
      window.__userScriptReady = false;
      window.__userScriptClose = undefined;
    };
  }, []);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenPayload>).detail;
      if (!detail?.requestId) return;
      const nextItems: ScriptItem[] = Array.isArray(detail.items) ? detail.items.map((item) => ({ ...item })) : [];

      setOpenState({ requestId: detail.requestId, items: nextItems });
      setItems(nextItems);
      setSelectedId(nextItems[0]?.id ?? null);
      // Fade in now that we have real data to show — avoids a flash of
      // the empty state before items are populated.
      document.documentElement.style.opacity = "1";
    };
    window.addEventListener("__userScriptOpen", onOpen);
    return () => window.removeEventListener("__userScriptOpen", onOpen);
  }, []);

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);
  if (!openState) return <div style={{ display: "none" }} />;

  const closeSave = () => sendResolve(openState.requestId, items);
  const closeCancel = () => sendResolve(openState.requestId, null);

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
        // const next = { ...formData };
        // next.name = (next.name || "Unnamed Script").trim();
        // if (!next.matches.length) next.matches = ["*://*/*"];
        // next.source = withMeta(next.source || "", next);
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
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={closeSave}
    >
      <div
        style={{
          width: "980px",
          maxWidth: "96vw",
          height: "80vh",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          boxShadow: "0 30px 80px rgba(2,6,23,.30)",
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            borderRight: "1px solid #e2e8f0",
            padding: "12px",
            overflow: "auto",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>UserScript Manager</div>
          <Button onClick={createNew}>New Script</Button>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  background: selectedId === item.id ? "#e2e8f0" : "#fff",
                  textAlign: "left",
                  padding: "8px",
                  cursor: "pointer",
                }}
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
            <div style={{ fontWeight: 600 }}>Edit Script</div>
            <button
              onClick={closeSave}
              style={{
                width: "24px",
                height: "24px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                cursor: "pointer",
                borderRadius: "6px",
              }}
            >
              ×
            </button>
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
                height: "30px",
                padding: "0 10px",
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
                onClick={closeCancel}
                style={{
                  height: "30px",
                  padding: "0 10px",
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
                  height: "30px",
                  padding: "0 10px",
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
                  setTimeout(closeSave, 0);
                }}
                style={{
                  height: "30px",
                  padding: "0 10px",
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
    </div>
  );
};

const host = document.getElementById("root") as HTMLElement;
const shadowRoot = host.attachShadow({ mode: "open" });

const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

createRoot(mountPoint).render(<App />);
