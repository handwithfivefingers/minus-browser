import React from "react";
import { IPC_INVOKE_CHANNEL } from "~/shared/constants/ipc";
import { SUB_WINDOW_RENDERER_EVENT } from "~/shared/constants/ipc/sub-window";

type Preference = {
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
  neverTranslateLanguages: string[];
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
  const [preference, setPreference] = React.useState<Preference>(defaultPreference);
  const [alwaysDomainsText, setAlwaysDomainsText] = React.useState("");
  const [neverDomainsText, setNeverDomainsText] = React.useState("");
  const [neverLanguagesText, setNeverLanguagesText] = React.useState("");
  const [openState, setOpenState] = React.useState(false);

  React.useEffect(() => {
    const raw = sessionStorage.getItem("subWindowPayload");
    sessionStorage.removeItem("subWindowPayload");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        const nextPreference = { ...defaultPreference, ...(data.preference || {}) };
        setPreference(nextPreference);
        setAlwaysDomainsText((nextPreference.alwaysTranslateDomains || []).join("\n"));
        setNeverDomainsText((nextPreference.neverTranslateDomains || []).join("\n"));
        setNeverLanguagesText((nextPreference.neverTranslateLanguages || []).join("\n"));
        setOpenState(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && openState) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openState]);

  if (!openState) return <div style={{ display: "none" }} />;

  const handleSave = () => {
    window.api.INVOKE(IPC_INVOKE_CHANNEL.TRANSLATE_SAVE_PREFERENCE, {
      ...preference,
      alwaysTranslateDomains: splitLines(alwaysDomainsText),
      neverTranslateDomains: splitLines(neverDomainsText),
      neverTranslateLanguages: splitLines(neverLanguagesText),
    });
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const handleCancel = () => {
    window.api.EMIT(SUB_WINDOW_RENDERER_EVENT.CLOSE);
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    fontSize: "12px",
    color: "white",
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px",
    fontSize: "12px",
    width: "100%",
    outline: "none",
  };

  return (
    <div
      className="flex flex-col max-w-lg w-full rounded-xl"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="text-white font-medium mb-4">Translate Preferences</div>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>
        <span className="text-white/60 font-medium">Source language</span>
        <input
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={preference.sourceLanguage}
          onChange={(event) => setPreference((prev) => ({ ...prev, sourceLanguage: event.target.value }))}
          style={inputStyle}
          placeholder="auto"
        />
      </label>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>
        <span>Target language</span>
        <input
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={preference.targetLanguage}
          onChange={(event) => setPreference((prev) => ({ ...prev, targetLanguage: event.target.value }))}
          style={inputStyle}
          placeholder="en"
        />
      </label>
      <label
        className="text-white"
        style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", fontSize: "12px" }}
      >
        <input
          className="text-white bg-white/5 rounded-md border border-slate-400"
          type="checkbox"
          checked={preference.autoTranslate}
          onChange={(event) => setPreference((prev) => ({ ...prev, autoTranslate: event.target.checked }))}
        />
        Enable auto-translate prompts
      </label>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>
        <span>Always translate domains (one per line)</span>
        <textarea
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={alwaysDomainsText}
          onChange={(event) => setAlwaysDomainsText(event.target.value)}
          style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
          placeholder="news.example.com"
        />
      </label>
      <label style={{ ...labelStyle, marginBottom: "8px" }}>
        <span>Never translate domains (one per line)</span>
        <textarea
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={neverDomainsText}
          onChange={(event) => setNeverDomainsText(event.target.value)}
          style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
          placeholder="mail.example.com"
        />
      </label>
      <label style={labelStyle}>
        <span>Never translate languages (one per line, ex: ja)</span>
        <textarea
          className="text-white bg-white/5 rounded-md border border-slate-400"
          value={neverLanguagesText}
          onChange={(event) => setNeverLanguagesText(event.target.value)}
          style={{ ...inputStyle, minHeight: "92px", resize: "vertical" }}
          placeholder="en"
        />
      </label>
      <div className="flex justify-end gap-4 shrink-0 p-2 mt-4 border-t border-slate-200">
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
  );
};

export default App;
