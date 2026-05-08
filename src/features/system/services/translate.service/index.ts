import path from "node:path";
import { pathToFileURL } from "node:url";
import { BrowserWindow, WebContentsView } from "electron";
import { v7 as uuidv7 } from "uuid";
import { Tab } from "../../classes/tab";
import {
  ITranslateDetectResult,
  ITranslatePreference,
  ITranslateSelectionHistoryItem,
  ITranslateStore,
} from "../../interfaces/translate";
import { StoreManager } from "../../stores";

const SENTINEL = "__TRANSLATE_RESOLVE__:";
const MAX_RECENT_SELECTIONS = 40;

const DEFAULT_PREFERENCE: ITranslatePreference = {
  sourceLanguage: "auto",
  targetLanguage: "en",
  autoTranslate: true,
  alwaysTranslateDomains: [],
  neverTranslateDomains: [],
  neverTranslateLanguages: [],
};

type TranslateManagerPayload = {
  requestId: string;
  preference: ITranslatePreference;
  recentSelections: ITranslateSelectionHistoryItem[];
};

function getSafeDirname(): string {
  if (typeof __dirname !== "undefined") return __dirname;
  // @ts-ignore
  if (typeof import.meta?.dirname !== "undefined") return import.meta.dirname;
  // @ts-ignore
  if (typeof import.meta?.url !== "undefined") return path.dirname(new URL(import.meta.url).pathname);
  throw new Error("Cannot resolve __dirname in current module context");
}

function resolveTranslateUrl(): string {
  if (
    // @ts-ignore
    typeof TRANSLATE_INJECTION_VITE_DEV_SERVER_URL !== "undefined" &&
    // @ts-ignore
    TRANSLATE_INJECTION_VITE_DEV_SERVER_URL
  ) {
    // @ts-ignore
    return `${TRANSLATE_INJECTION_VITE_DEV_SERVER_URL}`.replace(/\/$/, "") + "/";
  }
  const basePath = path.join(
    getSafeDirname(),
    // @ts-ignore
    // `../renderer/${TRANSLATE_INJECTION_VITE_NAME}/index.html`,
    `../renderer/main_window/src/features/injection/apps/translate/index.html`,
  );
  return pathToFileURL(basePath).toString();
}

export class TranslateService {
  private store = new StoreManager("translate");
  private preference: ITranslatePreference = { ...DEFAULT_PREFERENCE };
  private recentSelections: ITranslateSelectionHistoryItem[] = [];

  async initialize() {
    const raw = await this.store.readFiles<ITranslateStore>();
    this.preference = { ...DEFAULT_PREFERENCE, ...(raw?.preference || {}) };
    this.recentSelections = Array.isArray(raw?.recentSelections) ? raw.recentSelections : [];
  }

  private async persist() {
    await this.store.saveFiles<ITranslateStore>({
      preference: this.preference,
      recentSelections: this.recentSelections,
    });
  }

  getPreference() {
    return this.preference;
  }

  getRecentSelections() {
    return [...this.recentSelections];
  }

  async savePreference(patch: Partial<ITranslatePreference>) {
    this.preference = {
      ...this.preference,
      ...patch,
      alwaysTranslateDomains: [
        ...new Set((patch.alwaysTranslateDomains || this.preference.alwaysTranslateDomains).map(normalizeDomain)),
      ].filter(Boolean),
      neverTranslateDomains: [
        ...new Set((patch.neverTranslateDomains || this.preference.neverTranslateDomains).map(normalizeDomain)),
      ].filter(Boolean),
      neverTranslateLanguages: [
        ...new Set((patch.neverTranslateLanguages || this.preference.neverTranslateLanguages).map(normalizeLanguage)),
      ].filter(Boolean),
      sourceLanguage: normalizeLanguage(patch.sourceLanguage || this.preference.sourceLanguage || "auto") || "auto",
      targetLanguage: normalizeLanguage(patch.targetLanguage || this.preference.targetLanguage || "en") || "en",
    };
    await this.persist();
    return this.preference;
  }

  shouldAutoTranslate(domain: string, language?: string) {
    const safeDomain = normalizeDomain(domain);
    const safeLanguage = normalizeLanguage(language || "");
    if (!this.preference.autoTranslate) return false;
    if (safeDomain && this.preference.neverTranslateDomains.includes(safeDomain)) return false;
    if (safeLanguage && this.preference.neverTranslateLanguages.includes(safeLanguage)) return false;
    if (safeDomain && this.preference.alwaysTranslateDomains.includes(safeDomain)) return true;
    return true;
  }

  async detectLanguage(text: string): Promise<ITranslateDetectResult> {
    const sample = text.trim().slice(0, 3000);
    if (!sample) return { language: "unknown", confidence: 0 };
    const endpoint =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&dt=ld&ie=UTF-8&oe=UTF-8&q=" +
      encodeURIComponent(sample);
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Translate detect failed: ${response.status}`);
    }
    const body = (await response.json()) as any[];
    const detected = normalizeLanguage(body?.[2] || "unknown");
    return {
      language: detected || "unknown",
      confidence: 1,
    };
  }

  async translateSelection(input: { tabId: string; text: string; sourceLanguage?: string; targetLanguage?: string }) {
    const sourceLanguage =
      normalizeLanguage(input.sourceLanguage || this.preference.sourceLanguage || "auto") || "auto";
    const targetLanguage = normalizeLanguage(input.targetLanguage || this.preference.targetLanguage || "en") || "en";
    const text = (input.text || "").trim();
    if (!text) return null;
    const endpoint =
      "https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&dt=ld&ie=UTF-8&oe=UTF-8" +
      `&sl=${encodeURIComponent(sourceLanguage)}&tl=${encodeURIComponent(targetLanguage)}&q=${encodeURIComponent(text)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`Translate selection failed: ${response.status}`);
    }
    const body = (await response.json()) as any[];
    const translatedText = Array.isArray(body?.[0]) ? body[0].map((item: any[]) => item?.[0] || "").join("") : "";
    const detectedLanguage = normalizeLanguage(body?.[2] || sourceLanguage) || sourceLanguage;

    const history: ITranslateSelectionHistoryItem = {
      id: uuidv7(),
      tabId: input.tabId,
      sourceText: text,
      translatedText,
      sourceLanguage: detectedLanguage,
      targetLanguage,
      createdAt: Date.now(),
    };
    this.recentSelections = [history, ...this.recentSelections].slice(0, MAX_RECENT_SELECTIONS);
    await this.persist();
    return history;
  }

  buildGoogleTranslateUrl(input: { targetUrl: string; targetLanguage?: string }) {
    const targetLanguage = normalizeLanguage(input.targetLanguage || this.preference.targetLanguage || "en") || "en";
    return `https://translate.google.com/translate?sl=auto&tl=${encodeURIComponent(targetLanguage)}&u=${encodeURIComponent(input.targetUrl)}`;
  }

  async openManager(
    win: BrowserWindow,
    tab: Tab,
  ): Promise<{ preference: ITranslatePreference; recentSelections: ITranslateSelectionHistoryItem[] } | null> {
    const requestId = `translate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const translateView = new WebContentsView({
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
      },
    });
    translateView.setBounds(tab.view.getBounds());
    translateView.setBackgroundColor("#00000000");
    win.contentView.addChildView(translateView);

    return new Promise((resolve, reject) => {
      let isReady = false;
      const onConsoleMessage = (_event: any, _level: any, message: string) => {
        if (!message.startsWith(SENTINEL)) return;
        try {
          const json = message.slice(SENTINEL.length);
          const data = JSON.parse(json);
          if (data?.requestId !== requestId) return;
          settle({
            preference: { ...this.preference, ...(data?.payload?.preference || {}) },
            recentSelections: Array.isArray(data?.payload?.recentSelections)
              ? data.payload.recentSelections
              : this.recentSelections,
          });
        } catch {
          settle(null);
        }
      };

      const teardown = () => {
        translateView.webContents.off("console-message", onConsoleMessage);
        translateView.webContents.off("render-process-gone", onGone);
        clearTimeout(readyTimer);
        try {
          win.contentView.removeChildView(translateView);
        } catch {}
      };

      const settle = (
        value: { preference: ITranslatePreference; recentSelections: ITranslateSelectionHistoryItem[] } | null,
      ) => {
        if (!isReady) return;
        if (!translateView.webContents.isDestroyed()) {
          translateView.webContents
            .executeJavaScript(`window.__translateClose && window.__translateClose();`)
            .catch(() => {});
        }
        setTimeout(() => {
          teardown();
          resolve(value);
        }, 150);
      };

      const onGone = () => {
        if (!isReady) {
          isReady = true;
          teardown();
          reject(new Error("translate-view-render-process-gone"));
        }
      };

      const readyTimer = setTimeout(() => {
        if (!isReady) {
          isReady = true;
          teardown();
          reject(new Error("translate-view-ready-timeout"));
        }
      }, 8000);

      translateView.webContents.on("console-message", onConsoleMessage);
      translateView.webContents.on("render-process-gone", onGone);
      translateView.webContents.once("did-finish-load", () => {
        isReady = true;
        const openPayload: TranslateManagerPayload = {
          requestId,
          preference: this.preference,
          recentSelections: this.recentSelections,
        };
        translateView.webContents
          .executeJavaScript(
            `(() => {
            const deliver = () => {
              window.dispatchEvent(new CustomEvent("__translateOpen", { detail: ${JSON.stringify(openPayload)} }));
            };
            if (window.__translateReady) {
              deliver();
              return;
            }
            requestAnimationFrame(() => {
              if (window.__translateReady) {
                deliver();
                return;
              }
              setTimeout(() => {
                if (window.__translateReady) deliver();
              }, 200);
            });
          })();`,
          )
          .catch(() => {});
      });
      translateView.webContents.loadURL(resolveTranslateUrl()).catch((error) => {
        teardown();
        reject(error);
      });
    });
  }

  async applyManagerState(payload: {
    preference: ITranslatePreference;
    recentSelections: ITranslateSelectionHistoryItem[];
  }) {
    this.preference = { ...DEFAULT_PREFERENCE, ...(payload.preference || {}) };
    this.recentSelections = Array.isArray(payload.recentSelections)
      ? payload.recentSelections.slice(0, MAX_RECENT_SELECTIONS)
      : [];
    await this.persist();
  }
}

function normalizeLanguage(language: string) {
  return String(language || "")
    .trim()
    .toLowerCase();
}

function normalizeDomain(domain: string) {
  return String(domain || "")
    .trim()
    .toLowerCase()
    .replace(/^www\./, "");
}
