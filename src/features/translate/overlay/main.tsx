import React from "react";
import { createRoot } from "react-dom/client";
// @ts-ignore
import "./assets/styles.css";
type Preference = {
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
  neverTranslateLanguages: string[];
};

type SelectionItem = {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
};

type OpenPayload = {
  requestId: string;
  preference: Preference;
  recentSelections: SelectionItem[];
};

declare global {
  interface Window {
    __translateReady?: boolean;
    __translateClose?: () => void;
  }
}

const RESOLVE_SENTINEL = "__TRANSLATE_RESOLVE__:";

const sendResolve = (
  requestId: string,
  payload: { preference: Preference; recentSelections: SelectionItem[] } | null,
) => {
  console.log(RESOLVE_SENTINEL + JSON.stringify({ requestId, payload }));
};

const defaultPreference: Preference = {
  sourceLanguage: "auto",
  targetLanguage: "en",
  autoTranslate: true,
  alwaysTranslateDomains: [],
  neverTranslateDomains: [],
  neverTranslateLanguages: [],
};

const splitLines = (value: string) =>
  value
    .split("\n")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const App = () => {
  const [openState, setOpenState] = React.useState<OpenPayload | null>(null);
  const [preference, setPreference] = React.useState<Preference>(defaultPreference);
  const [recentSelections, setRecentSelections] = React.useState<SelectionItem[]>([]);
  const [alwaysDomainsText, setAlwaysDomainsText] = React.useState("");
  const [neverDomainsText, setNeverDomainsText] = React.useState("");
  const [neverLanguagesText, setNeverLanguagesText] = React.useState("");

  React.useEffect(() => {
    window.__translateReady = true;
    window.__translateClose = () => {
      document.documentElement.style.opacity = "0";
    };
    return () => {
      window.__translateReady = false;
      window.__translateClose = undefined;
    };
  }, []);

  React.useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<OpenPayload>).detail;
      if (!detail?.requestId) return;
      const nextPreference = { ...defaultPreference, ...(detail.preference || {}) };
      setOpenState(detail);
      setPreference(nextPreference);
      setRecentSelections(Array.isArray(detail.recentSelections) ? detail.recentSelections : []);
      setAlwaysDomainsText((nextPreference.alwaysTranslateDomains || []).join("\n"));
      setNeverDomainsText((nextPreference.neverTranslateDomains || []).join("\n"));
      setNeverLanguagesText((nextPreference.neverTranslateLanguages || []).join("\n"));
      document.documentElement.style.opacity = "1";
    };
    window.addEventListener("__translateOpen", onOpen);
    return () => window.removeEventListener("__translateOpen", onOpen);
  }, []);

  if (!openState) return <div style={{ display: "none" }} />;

  const closeWithCancel = () => sendResolve(openState.requestId, null);
  const closeWithSave = () =>
    sendResolve(openState.requestId, {
      preference: {
        ...preference,
        alwaysTranslateDomains: splitLines(alwaysDomainsText),
        neverTranslateDomains: splitLines(neverDomainsText),
        neverTranslateLanguages: splitLines(neverLanguagesText),
      },
      recentSelections,
    });

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    color: "#475569",
  };

  const inputStyle: React.CSSProperties = {
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    padding: "8px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
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
      onClick={closeWithCancel}
    >
      <div
        // style={{
        //   width: "980px",
        //   maxWidth: "96vw",
        //   maxHeight: "84vh",
        //   background: "#fff",
        //   border: "1px solid #e2e8f0",
        //   borderRadius: "14px",
        //   boxShadow: "0 30px 80px rgba(2,6,23,.30)",
        //   display: "grid",
        //   gridTemplateColumns: "1fr 1fr",
        //   overflow: "hidden",
        // }}
        className="flex flex-col max-w-5xl w-full h-full m-4 max-h-[84vh] overflow-hidden shadow-2xl rounded-xl border border-slate-200 bg-white"
        onClick={(event) => event.stopPropagation()}
      >
        {/* h-[calc(100%-60px)] */}
        <div className="flex w-full flex-1  overflow-hidden">
          <div className="p-4 border-r border-slate-200">
            <div style={{ fontWeight: 600, marginBottom: "10px", fontSize: "15px" }}>Translate Preferences</div>
            <label style={{ ...labelStyle, marginBottom: "8px" }}>
              <span>Source language</span>
              <input
                value={preference.sourceLanguage}
                onChange={(event) => setPreference((prev) => ({ ...prev, sourceLanguage: event.target.value }))}
                style={inputStyle}
                placeholder="auto"
              />
            </label>
            <label style={{ ...labelStyle, marginBottom: "8px" }}>
              <span>Target language</span>
              <input
                value={preference.targetLanguage}
                onChange={(event) => setPreference((prev) => ({ ...prev, targetLanguage: event.target.value }))}
                style={inputStyle}
                placeholder="en"
              />
            </label>
            <label
              style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontSize: "12px" }}
            >
              <input
                type="checkbox"
                checked={preference.autoTranslate}
                onChange={(event) => setPreference((prev) => ({ ...prev, autoTranslate: event.target.checked }))}
              />
              Enable auto-translate prompts
            </label>
            <label style={{ ...labelStyle, marginBottom: "8px" }}>
              <span>Always translate domains (one per line)</span>
              <textarea
                value={alwaysDomainsText}
                onChange={(event) => setAlwaysDomainsText(event.target.value)}
                style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
                placeholder="news.example.com"
              />
            </label>
            <label style={{ ...labelStyle, marginBottom: "8px" }}>
              <span>Never translate domains (one per line)</span>
              <textarea
                value={neverDomainsText}
                onChange={(event) => setNeverDomainsText(event.target.value)}
                style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
                placeholder="mail.example.com"
              />
            </label>
            <label style={labelStyle}>
              <span>Never translate languages (one per line, ex: ja)</span>
              <textarea
                value={neverLanguagesText}
                onChange={(event) => setNeverLanguagesText(event.target.value)}
                style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
                placeholder="en"
              />
            </label>
          </div>
          <div
            // style={{ padding: "16px", display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}
            className="p-4 flex flex-col overflow-hidden min-h-0"
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "10px",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: "15px" }}>Selection Translate History</div>
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
            <div
              className="overflow-auto flex flex-col gap-2 h-full flex-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "#94a3b8 transparent",
                scrollbarGutter: "stable",
              }}
            >
              {!recentSelections.length && (
                <div style={{ color: "#94a3b8", fontSize: "12px" }}>No selection translations yet.</div>
              )}
              {recentSelections.map((item) => (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    padding: "10px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                >
                  <div style={{ fontSize: "11px", color: "#64748b" }}>
                    {item.sourceLanguage} -&gt; {item.targetLanguage}
                  </div>
                  <div style={{ fontSize: "12px", color: "#0f172a" }}>{item.sourceText}</div>
                  <div style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 500 }}>{item.translatedText}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4 shrink-0 p-2 border-t border-slate-200">
          <button
            type="button"
            onClick={() => setRecentSelections([])}
            style={{
              height: "30px",
              padding: "0 12px",
              borderRadius: "8px",
              border: "1px solid #fecaca",
              background: "#fee2e2",
              color: "#b91c1c",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear History
          </button>
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
  );
};

const root = createRoot(document.getElementById("root") as HTMLElement);
root.render(<App />);
