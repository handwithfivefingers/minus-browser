import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type VaultItem = {
  id: string;
  site: string;
  username: string;
  password: string;
  notes?: string;
};

type OpenPayload = {
  requestId: string;
  items: VaultItem[];
};

const postResolve = (requestId: string, payload: VaultItem[] | null) => {
  window.parent.postMessage(
    {
      source: "minus-vault-injection",
      type: "RESOLVE",
      requestId,
      payload,
    },
    "*",
  );
};

const App = () => {
  const [openState, setOpenState] = useState<OpenPayload | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  React.useEffect(() => {
    window.parent.postMessage(
      {
        source: "minus-vault-injection",
        type: "READY",
      },
      "*",
    );
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event?.data;
      if (!data || data?.source !== "minus-parent" || data?.type !== "OPEN") {
        return;
      }
      const nextItems: VaultItem[] = Array.isArray(data.payload?.items)
        ? data.payload.items.map((item: VaultItem) => ({ ...item }))
        : [];
      setOpenState({
        requestId: String(data.payload.requestId),
        items: nextItems,
      });
      setItems(nextItems);
      setSelectedId(nextItems[0]?.id || null);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        postResolve(openState.requestId, items);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState, items]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) || null,
    [items, selectedId],
  );

  if (!openState) {
    return <div style={{ display: "none" }} />;
  }

  const closeWithSave = () => postResolve(openState.requestId, items);
  const closeWithCancel = () => postResolve(openState.requestId, null);

  const setSelectedField = (key: keyof VaultItem, value: string) => {
    if (!selected) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === selected.id ? { ...item, [key]: value } : item,
      ),
    );
  };

  const removeSelected = () => {
    if (!selected) return;
    const next = items.filter((item) => item.id !== selected.id);
    setItems(next);
    setSelectedId(next[0]?.id || null);
  };

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`;
    const next = [
      { id, site: "", username: "", password: "", notes: "" },
      ...items,
    ];
    setItems(next);
    setSelectedId(id);
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
      onClick={closeWithSave}
    >
      <div
        style={{
          width: "920px",
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
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            borderRight: "1px solid #e2e8f0",
            padding: "12px",
            overflow: "auto",
            background: "#f8fafc",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>Vault</div>
          <button
            type="button"
            onClick={createNew}
            style={{
              height: "30px",
              padding: "0 10px",
              borderRadius: "8px",
              border: "1px solid transparent",
              background: "#0f172a",
              color: "#fff",
              cursor: "pointer",
              marginBottom: "8px",
            }}
          >
            New
          </button>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {items.map((item) => (
              <button
                type="button"
                key={item.id}
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
                <div style={{ fontWeight: 500 }}>
                  Domain: {item.site || "new site"}
                </div>
                <div
                  style={{
                    fontWeight: 300,
                    color: "rgba(0,0,0,.8)",
                    marginTop: "2px",
                  }}
                >
                  {item.username || "unknown"}
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
            <div style={{ fontWeight: 600 }}>Edit Credential</div>
            <button
              type="button"
              onClick={closeWithSave}
              style={{
                width: "20px",
                height: "20px",
                border: "1px solid #cbd5e1",
                background: "#f8fafc",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          {selected ? (
            <>
              <label
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span>Domain</span>
                <input
                  value={selected.site || ""}
                  onChange={(event) =>
                    setSelectedField("site", event.target.value)
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span>Email / Username</span>
                <input
                  value={selected.username || ""}
                  onChange={(event) =>
                    setSelectedField("username", event.target.value)
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span>Password</span>
                <input
                  type="password"
                  value={selected.password || ""}
                  onChange={(event) =>
                    setSelectedField("password", event.target.value)
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                />
              </label>
              <label
                style={{ display: "flex", flexDirection: "column", gap: "4px" }}
              >
                <span>Notes</span>
                <textarea
                  value={selected.notes || ""}
                  onChange={(event) =>
                    setSelectedField("notes", event.target.value)
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    minHeight: "90px",
                    fontSize: "12px",
                  }}
                />
              </label>
            </>
          ) : null}

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
                borderRadius: "8px",
                border: "1px solid #fecaca",
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
                onClick={closeWithCancel}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  background: "#e2e8f0",
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={closeWithSave}
                style={{
                  height: "30px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "1px solid transparent",
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

// createRoot(document.getElementById("root") as HTMLElement).render(<App />);
const host = document.getElementById("root") as HTMLElement;
const shadowRoot = host.attachShadow({ mode: "open" });

const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

createRoot(mountPoint).render(<App />);
