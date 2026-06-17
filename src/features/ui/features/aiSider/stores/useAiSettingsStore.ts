import { create } from "zustand";

const STORAGE_KEY = "minus_ai_settings";

export type DefaultMode = "chat" | "summarize" | "generate" | "explain";

export interface IAiSettings {
  defaultModel: string;
  defaultMode: DefaultMode;
  temperature: number;
  maxTokens: number;
  showFloatingButton: boolean;
  provider: string;
  apiKey: string;
  baseUrl: string;
  language: string;
}

interface IAiSettingsStore extends IAiSettings {
  setDefaultModel: (model: string) => void;
  setDefaultMode: (mode: DefaultMode) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setShowFloatingButton: (show: boolean) => void;
  setProvider: (provider: string) => void;
  setApiKey: (apiKey: string) => void;
  setBaseUrl: (baseUrl: string) => void;
  setLanguage: (language: string) => void;
  reset: () => void;
}

const DEFAULTS: IAiSettings = {
  defaultModel: "llama-3.3-70b-versatile",
  defaultMode: "chat",
  temperature: 0.7,
  maxTokens: 4096,
  showFloatingButton: true,
  provider: "groq",
  apiKey: "",
  baseUrl: "",
  language: "english",
};

function loadFromStorage(): IAiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULTS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

function saveToStorage(state: IAiSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const useAiSettingsStore = create<IAiSettingsStore>((set) => ({
  ...loadFromStorage(),
  setDefaultModel: (defaultModel) =>
    set((state) => {
      const next = { ...state, defaultModel };
      saveToStorage(next);
      return { defaultModel };
    }),
  setDefaultMode: (defaultMode) =>
    set((state) => {
      const next = { ...state, defaultMode };
      saveToStorage(next);
      return { defaultMode };
    }),
  setTemperature: (temperature) =>
    set((state) => {
      const next = { ...state, temperature };
      saveToStorage(next);
      return { temperature };
    }),
  setMaxTokens: (maxTokens) =>
    set((state) => {
      const next = { ...state, maxTokens };
      saveToStorage(next);
      return { maxTokens };
    }),
  setShowFloatingButton: (showFloatingButton) =>
    set((state) => {
      const next = { ...state, showFloatingButton };
      saveToStorage(next);
      return { showFloatingButton };
    }),
  setProvider: (provider) =>
    set((state) => {
      const next = { ...state, provider };
      saveToStorage(next);
      return { provider };
    }),
  setApiKey: (apiKey) =>
    set((state) => {
      const next = { ...state, apiKey };
      saveToStorage(next);
      return { apiKey };
    }),
  setBaseUrl: (baseUrl) =>
    set((state) => {
      const next = { ...state, baseUrl };
      saveToStorage(next);
      return { baseUrl };
    }),
  setLanguage: (language) =>
    set((state) => {
      const next = { ...state, language };
      saveToStorage(next);
      return { language };
    }),
  reset: () => {
    saveToStorage(DEFAULTS);
    set({ ...DEFAULTS });
  },
}));

export { useAiSettingsStore };
