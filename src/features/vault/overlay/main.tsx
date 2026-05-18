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

// ---------------------------------------------------------------------------
// IPC bridge — zero preload edition
//
// We have no preload script, so ipcRenderer is unavailable.
// The main process communicates with us by calling executeJavaScript()
// which dispatches a CustomEvent("__vaultOpen") on window.
//
// We communicate back to the main process via a console.log sentinel that
// the main process intercepts through webContents "console-message" event:
//   console.log("__VAULT_RESOLVE__:" + JSON.stringify({ requestId, payload }))
//
// This is intentional and safe — the main process owns this WebContentsView
// and is the only consumer of its console output.
// ---------------------------------------------------------------------------

const RESOLVE_SENTINEL = "__VAULT_RESOLVE__:";

const sendResolve = (requestId: string, payload: VaultItem[] | null) => {
  // Signal to the main process via console-message bridge.
  console.log(RESOLVE_SENTINEL + JSON.stringify({ requestId, payload }));
};

// ---------------------------------------------------------------------------
// Shadow-root styles
// This WebContentsView loads our own HTML, but we still use a shadow root
// so internal styles are encapsulated and won't conflict if the host page
// ever injects anything. Vite <style> tags go into <head> which IS our
// document here (not a foreign page), so they work normally — but the
// shadow root reset ensures clean baseline regardless.
// ---------------------------------------------------------------------------

const SHADOW_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  :host { all: initial; font-family: system-ui, -apple-system, sans-serif; }
  input, textarea, button { font-family: inherit; }
`;

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    __vaultReady?: boolean;
    __vaultClose?: () => void;
  }
}

const App = () => {
  const [openState, setOpenState] = useState<OpenPayload | null>(null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Signal to the main process that React has mounted and we are ready
  // to receive the OPEN payload. The main process checks window.__vaultReady
  // before dispatching the __vaultOpen CustomEvent.
  React.useEffect(() => {
    window.__vaultReady = true;

    // __vaultClose is called by the main process (fire-and-forget
    // executeJavaScript) when the dialog is resolving. It triggers the
    // CSS fade-out so the view looks smooth before being removed.
    window.__vaultClose = () => {
      document.documentElement.style.opacity = "0";
    };

    return () => {
      window.__vaultReady = false;
      window.__vaultClose = undefined;
    };
  }, []);

  // Listen for the OPEN payload dispatched by the main process via
  // executeJavaScript → CustomEvent("__vaultOpen").
  React.useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenPayload>).detail;
      if (!detail?.requestId) return;

      const nextItems: VaultItem[] = Array.isArray(detail.items)
        ? detail.items.map((item) => ({ ...item }))
        : [];

      setOpenState({ requestId: detail.requestId, items: nextItems });
      setItems(nextItems);
      setSelectedId(nextItems[0]?.id ?? null);
      setShowPassword(false);

      // Fade in now that we have real data to show — avoids a flash of
      // the empty state before items are populated.
      document.documentElement.style.opacity = "1";
    };

    window.addEventListener("__vaultOpen", onOpen);
    return () => window.removeEventListener("__vaultOpen", onOpen);
  }, []);

  // Escape → cancel (discard changes, resolve null).
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        sendResolve(openState.requestId, null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState]);

  const selected = useMemo(
    () => items.find((item) => item.id === selectedId) ?? null,
    [items, selectedId],
  );

  if (!openState) {
    // Render nothing visible until OPEN payload arrives.
    return <div style={{ display: "none" }} />;
  }

  const closeWithSave = () => sendResolve(openState.requestId, items);
  const closeWithCancel = () => sendResolve(openState.requestId, null);

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
    setSelectedId(next[0]?.id ?? null);
  };

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`;
    const next: VaultItem[] = [
      { id, site: "", username: "", password: "", notes: "" },
      ...items,
    ];
    setItems(next);
    setSelectedId(id);
    setShowPassword(false);
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
    background: "#fff",
  };

  return (
    // Full-viewport backdrop. Clicking it cancels.
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={closeWithCancel}
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
            gridTemplateColumns: "300px 1fr",
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Sidebar ───────────────────────────────────────────────── */}
          <div
            style={{
              borderRight: "1px solid #e2e8f0",
              padding: "12px",
              overflow: "auto",
              background: "#f8fafc",
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
              <div style={{ fontWeight: 600, fontSize: "14px" }}>Vault</div>
              <button
                type="button"
                onClick={createNew}
                style={{
                  height: "28px",
                  padding: "0 10px",
                  borderRadius: "8px",
                  border: "1px solid transparent",
                  background: "#0f172a",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                + New
              </button>
            </div>

            {items.length === 0 && (
              <div
                style={{ fontSize: "12px", color: "#94a3b8", padding: "4px 0" }}
              >
                No credentials yet.
              </div>
            )}

            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
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
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: "13px" }}>
                    {item.site || "new site"}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(0,0,0,.55)",
                      marginTop: "2px",
                    }}
                  >
                    {item.username || "—"}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Detail panel ──────────────────────────────────────────── */}
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
              <button
                type="button"
                onClick={closeWithCancel}
                style={{
                  width: "24px",
                  height: "24px",
                  border: "1px solid #cbd5e1",
                  background: "#f8fafc",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            </div>

            {selected ? (
              <>
                <label
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
                      color: "#475569",
                    }}
                  >
                    Domain
                  </span>
                  <input
                    value={selected.site}
                    onChange={(e) => setSelectedField("site", e.target.value)}
                    placeholder="example.com"
                    style={inputStyle}
                  />
                </label>

                <label
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
                      color: "#475569",
                    }}
                  >
                    Email / Username
                  </span>
                  <input
                    value={selected.username}
                    onChange={(e) =>
                      setSelectedField("username", e.target.value)
                    }
                    placeholder="user@example.com"
                    style={inputStyle}
                  />
                </label>

                <label
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
                      color: "#475569",
                    }}
                  >
                    Password
                  </span>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={selected.password}
                      onChange={(e) =>
                        setSelectedField("password", e.target.value)
                      }
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
                      color: "#475569",
                    }}
                  >
                    Notes
                  </span>
                  <textarea
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
              <div style={{ color: "#94a3b8", fontSize: "13px" }}>
                Pick a credential from the list or create a new one.
              </div>
            )}

            {/* ── Footer ──────────────────────────────────────────────── */}
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
                  onClick={closeWithCancel}
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
                  onClick={closeWithSave}
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
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// Mount into a Shadow Root
// Isolates vault UI styles from anything the host document might inject.
// ---------------------------------------------------------------------------

// Start invisible — the main process will set opacity to 1 after delivering
// the OPEN payload, giving a clean fade-in instead of a flash of unstyled content.
document.documentElement.style.opacity = "0";
document.documentElement.style.transition = "opacity 90ms ease";

const host = document.getElementById("root") as HTMLElement;
const shadowRoot = host.attachShadow({ mode: "open" });

const styleEl = document.createElement("style");
styleEl.textContent = SHADOW_STYLES;
shadowRoot.appendChild(styleEl);

const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

createRoot(mountPoint).render(<App />);
