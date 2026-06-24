import clsx from "clsx";
import React, { useMemo, useRef, useState } from "react";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";

type VaultItem = {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
};

const App = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [openState, setOpenState] = React.useState<boolean>(false);
  const originalItemsRef = useRef<VaultItem[]>([]);

  React.useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const nextItems: VaultItem[] = Array.isArray(data.items) ? data.items.map((item: any) => ({ ...item })) : [];
        originalItemsRef.current = nextItems.map((item: VaultItem) => ({ ...item }));
        setItems(nextItems);
        setSelectedId(nextItems[0]?.id ?? null);
        setShowPassword(false);
        setOpenState(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const handleSave = async () => {
    const originalIds = new Set(originalItemsRef.current.map((v: VaultItem) => v.id));
    const currentIds = new Set(items.map((v: VaultItem) => v.id));
    for (const vault of items) {
      if (!vault.id || vault.id.startsWith("new-")) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_ADD, {
          site: vault.site,
          username: vault.username,
          password: vault.password,
          notes: vault.notes || "",
        });
      } else {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_UPDATE, { id: vault.id, patch: vault });
      }
    }
    for (const item of originalItemsRef.current) {
      if (!currentIds.has(item.id)) {
        await window.api.INVOKE(IPC_INVOKE_CHANNEL.VAULT_DELETE, { id: item.id });
      }
    }
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const handleCancel = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  if (!openState) {
    return <div style={{ display: "none" }} />;
  }

  const setSelectedField = (key: keyof VaultItem, value: string) => {
    if (!selected) return;
    setItems((prev) => prev.map((item) => (item.id === selected.id ? { ...item, [key]: value } : item)));
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`;
    const next: VaultItem[] = [{ id, site: "", username: "", password: "", notes: "" }, ...items];
    setItems(next);
    setSelectedId(id);
    setShowPassword(false);
  };

  const inputStyle: React.CSSProperties = {
    // border: "1px solid #cbd5e1",
    // borderRadius: "8px",
    padding: "8px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
    // background: "#fff",
  };

  return (
    <div
      className="w-200 h-[80vh]overflow-hidden rounded grid text-white"
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
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
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

        {items.length === 0 && (
          <div style={{ fontSize: "12px", color: "#94a3b8", padding: "4px 0" }}>No credentials yet.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {items.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={clsx("border border-white/50", {
                ["bg-slate-800 text-white"]: selectedId === item.id,
                ["bg-white text-slate-800"]: selectedId !== item.id,
              })}
              style={{
                borderRadius: "8px",
                // background: selectedId === item.id ? "#e2e8f0" : "#fff",
                textAlign: "left",
                padding: "8px 10px",
                cursor: "pointer",
              }}
            >
              <div className="font-medium text-sm ">{item.site || "new site"}</div>
              <div className="font-light text-xs">{item.username || "—"}</div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          overflow: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 600, fontSize: "14px" }}>
            {selected ? "Edit Credential" : "Select a credential"}
          </div>
        </div>

        {selected ? (
          <>
            <label
              className="text-white font-medium text-xs"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span>Domain</span>
              <input
                value={selected.site}
                className="text-white bg-white/5 rounded-md border border-slate-400"
                onChange={(e) => setSelectedField("site", e.target.value)}
                placeholder="example.com"
                style={inputStyle}
              />
            </label>

            <label
              className="text-white font-medium text-xs"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span>Email / Username</span>
              <input
                className="text-white bg-white/5 rounded-md border border-slate-400"
                value={selected.username}
                onChange={(e) => setSelectedField("username", e.target.value)}
                placeholder="user@example.com"
                style={inputStyle}
              />
            </label>

            <label
              className="text-white font-medium text-xs"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span>Password</span>
              <div style={{ position: "relative" }}>
                <input
                  className="text-white bg-white/5 rounded-md border border-slate-400"
                  type={showPassword ? "text" : "password"}
                  value={selected.password}
                  onChange={(e) => setSelectedField("password", e.target.value)}
                  placeholder="••••••••"
                  style={{ ...inputStyle, paddingRight: "60px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  style={{
                    position: "absolute",
                    right: "8px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: "#64748b",
                    padding: "2px 4px",
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            <label
              className="text-white"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                }}
              >
                Notes
              </span>
              <textarea
                className="text-white bg-white/5 rounded-md border border-slate-400"
                value={selected.notes ?? ""}
                onChange={(e) => setSelectedField("notes", e.target.value)}
                placeholder="Optional notes…"
                style={{
                  ...inputStyle,
                  minHeight: "90px",
                  resize: "vertical",
                }}
              />
            </label>
          </>
        ) : (
          <div style={{ color: "#94a3b8", fontSize: "13px" }}>Pick a credential from the list or create a new one.</div>
        )}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "8px",
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <button
            type="button"
            onClick={removeSelected}
            disabled={!selected}
            style={{
              height: "30px",
              padding: "0 12px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              background: selected ? "#fee2e2" : "#f8fafc",
              color: selected ? "#b91c1c" : "#cbd5e1",
              cursor: selected ? "pointer" : "not-allowed",
              fontSize: "12px",
            }}
          >
            Delete
          </button>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                height: "30px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#e2e8f0",
                color: "#334155",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              style={{
                height: "30px",
                padding: "0 12px",
                borderRadius: "8px",
                border: "1px solid transparent",
                background: "#4f46e5",
                color: "#fff",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
