import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

type ScriptItem = {
  id: string;
  name: string;
  source: string;
  matches?: string[];
  runAt?: "document-start" | "document-end" | "document-idle";
  enabled?: boolean;
};

type OpenPayload = { requestId: string; items: ScriptItem[] };

const parseMeta = (source: string) => {
  const lines = String(source || "").split("\n");
  let name = "Unnamed Script";
  let runAt: ScriptItem["runAt"] = "document-end";
  const matches: string[] = [];
  for (const line of lines) {
    const n = line.match(/^\/\/\s*@name\s+(.+)$/);
    const r = line.match(/^\/\/\s*@run-at\s+(.+)$/);
    const m = line.match(/^\/\/\s*@match\s+(.+)$/);
    if (n?.[1]) name = n[1].trim();
    if (r?.[1]) {
      const v = r[1].trim() as ScriptItem["runAt"];
      if (
        v === "document-start" ||
        v === "document-end" ||
        v === "document-idle"
      )
        runAt = v;
    }
    if (m?.[1]) matches.push(m[1].trim());
  }
  return { name, runAt, matches: matches.length ? matches : ["*://*/*"] };
};

const withMeta = (source: string, item: ScriptItem) => {
  const blockRegex = /\/\/\s*==UserScript==[\s\S]*?\/\/\s*==\/UserScript==\n?/m;
  const matches = (item.matches || ["*://*/*"])
    .map((m) => m.trim())
    .filter(Boolean);
  const block =
    "// ==UserScript==\n" +
    `// @name ${item.name || "New Script"}\n` +
    `${(matches.length ? matches : ["*://*/*"]).map((m) => `// @match ${m}`).join("\n")}\n` +
    `// @run-at ${item.runAt || "document-end"}\n` +
    "// ==/UserScript==\n";
  return blockRegex.test(source)
    ? source.replace(blockRegex, block)
    : `${block}\n${source}`;
};

const resolveToParent = (requestId: string, payload: ScriptItem[] | null) => {
  window.parent.postMessage(
    {
      source: "minus-userscript-injection",
      type: "RESOLVE",
      requestId,
      payload,
    },
    "*",
  );
};

const App = () => {
  const [openState, setOpenState] = useState<OpenPayload | null>(null);
  const [items, setItems] = useState<ScriptItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  React.useEffect(() => {
    window.parent.postMessage(
      { source: "minus-userscript-injection", type: "READY" },
      "*",
    );
  }, []);

  React.useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event?.data;
      if (!data || data.source !== "minus-parent" || data.type !== "OPEN")
        return;
      const nextItems: ScriptItem[] = (
        Array.isArray(data.payload?.items) ? data.payload.items : []
      ).map((raw: ScriptItem) => {
        const parsed = parseMeta(raw.source || "");
        return {
          ...raw,
          name: raw.name || parsed.name,
          runAt: raw.runAt || parsed.runAt,
          matches: raw.matches?.length ? raw.matches : parsed.matches,
          enabled: Boolean(raw.enabled),
        };
      });
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

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) || null,
    [items, selectedId],
  );
  if (!openState) return <div style={{ display: "none" }} />;

  const closeSave = () => resolveToParent(openState.requestId, items);
  const closeCancel = () => resolveToParent(openState.requestId, null);

  const createNew = () => {
    const id = `new-${Math.random().toString(36).slice(2)}`;
    const item: ScriptItem = {
      id,
      name: "New Script",
      source:
        "// ==UserScript==\n// @name New Script\n// @match *://*/*\n// @run-at document-end\n// ==/UserScript==\n",
      runAt: "document-end",
      matches: ["*://*/*"],
      enabled: false,
    };
    setItems((prev) => [item, ...prev]);
    setSelectedId(id);
  };

  const patchSelected = (patch: Partial<ScriptItem>) => {
    if (!selected) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selected.id ? { ...it, ...patch } : it)),
    );
  };

  const applySelected = () => {
    if (!selected) return;
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== selected.id) return it;
        const next = { ...it };
        next.name = (next.name || "Unnamed Script").trim();
        next.matches = (next.matches || ["*://*/*"])
          .map((m) => m.trim())
          .filter(Boolean);
        if (!next.matches.length) next.matches = ["*://*/*"];
        next.source = withMeta(next.source || "", next);
        return next;
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
          <div style={{ fontWeight: 600, marginBottom: "8px" }}>
            UserScript Manager
          </div>
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
            New Script
          </button>
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
              type="button"
              onClick={closeSave}
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
              <input
                value={selected.name || ""}
                onChange={(e) => patchSelected({ name: e.target.value })}
                placeholder="Script name"
                style={{
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px",
                }}
              />

              <div
                style={{ display: "flex", flexDirection: "column", gap: "6px" }}
              >
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
                    onClick={() =>
                      patchSelected({
                        matches: [...(selected.matches || ["*://*/*"]), ""],
                      })
                    }
                    style={{
                      height: "26px",
                      padding: "0 8px",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    + Rule
                  </button>
                </div>
                {(selected.matches || ["*://*/*"]).map((rule, idx) => (
                  <div
                    key={`${idx}-${rule}`}
                    style={{ display: "flex", gap: "6px" }}
                  >
                    <input
                      value={rule}
                      onChange={(e) => {
                        const next = [...(selected.matches || ["*://*/*"])];
                        next[idx] = e.target.value;
                        patchSelected({ matches: next });
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
                      onClick={() => {
                        const next = (selected.matches || ["*://*/*"]).filter(
                          (_, i) => i !== idx,
                        );
                        patchSelected({
                          matches: next.length ? next : ["*://*/*"],
                        });
                      }}
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
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "8px",
                }}
              >
                <select
                  value={selected.runAt || "document-end"}
                  onChange={(e) =>
                    patchSelected({
                      runAt: e.target.value as ScriptItem["runAt"],
                    })
                  }
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px",
                    fontSize: "12px",
                  }}
                >
                  <option value="document-start">document-start</option>
                  <option value="document-idle">document-idle</option>
                  <option value="document-end">document-end</option>
                </select>
                <button
                  type="button"
                  onClick={() => patchSelected({ enabled: !selected.enabled })}
                  style={{
                    minWidth: "66px",
                    border: "1px solid transparent",
                    borderRadius: "8px",
                    padding: "0 10px",
                    background: selected.enabled ? "#16a34a" : "#334155",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  {selected.enabled ? "ON" : "OFF"}
                </button>
              </div>

              <textarea
                value={selected.source || ""}
                onChange={(e) => patchSelected({ source: e.target.value })}
                style={{
                  flex: 1,
                  minHeight: "330px",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  padding: "8px",
                  fontSize: "12px",
                  fontFamily:
                    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                }}
              />
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

// createRoot(document.getElementById("root") as HTMLElement).render(<App />);
const host = document.getElementById("root") as HTMLElement;
const shadowRoot = host.attachShadow({ mode: "open" });

const mountPoint = document.createElement("div");
shadowRoot.appendChild(mountPoint);

createRoot(mountPoint).render(<App />);
