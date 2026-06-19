import { eventStore } from "~/core/stores";
import { TranslateService } from "../services";
import { ITranslatePreference, ITranslateSelection, ITranslateSelectionHistoryItem } from "../types";
import { BrowserWindow, WebContentsView } from "electron";

export class TranslateController {
  activeView: WebContentsView | null = null;
  private initialized = false;
  private initializing?: Promise<void>;
  constructor(private readonly service: TranslateService = new TranslateService()) {
    eventStore.listen("viewChanges", (view: WebContentsView) => {
      this.activeView = view;
    });
  }

  async initialize() {
    if (this.initialized) return;
    if (this.initializing) return this.initializing;
    this.initializing = this.service.initialize().then(() => {
      this.initialized = true;
    });
    return this.initializing;
  }

  scriptInjection(text: string, result: { sourceLanguage: string; targetLanguage: string; translatedText: string }) {
    return this.service.scriptInjection(text, result);
  }

  async getPreference() {
    await this.initialize();
    return this.service.getPreference();
  }

  async getRecentSelections() {
    await this.initialize();
    return this.service.getRecentSelections();
  }

  async savePreference(patch: Partial<ITranslatePreference>) {
    await this.initialize();
    return this.service.savePreference(patch);
  }

  async detectLanguage(data: { text: string }) {
    await this.initialize();
    if (!data?.text?.trim()) return { language: "unknown", confidence: 0 };
    return this.service.detectLanguage(data.text);
  }

  shouldAutoTranslate(domain: string, language?: string) {
    return this.service.shouldAutoTranslate(domain, language);
  }

  async translateSelection(data: ITranslateSelection) {
    await this.initialize();
    if (!data?.tabId) throw new Error("Tab id is required");
    if (!this.activeView) return;
    //   const tab = this.tabController?.getTabById(data.tabId);
    //   if (!tab) throw new Error("Tab not found");

    let text = data?.text?.trim() || "";
    if (!text) {
      const selected = await this.activeView.webContents.executeJavaScript(
        `(() => String(window.getSelection?.()?.toString?.() || "").trim())();`,
        true,
      );
      text = String(selected || "").trim();
    }
    if (!text) throw new Error("Selection text is required");

    const result = await this.service.translateSelection({
      ...data,
      text,
    });

    if (result?.translatedText) {
      const translateResponse = {
        sourceLanguage: result.sourceLanguage,
        translatedText: result.translatedText,
        targetLanguage: result.targetLanguage,
      };
      await this.activeView.webContents.executeJavaScript(this.scriptInjection(text, translateResponse), true);
    }
    return result;
    // return this.service.translateSelection(input);
  }

  buildTranslatePageUrl(input: { targetUrl: string; targetLanguage?: string }) {
    return this.service.buildGoogleTranslateUrl(input);
  }

  async translatePage(data: { tabId: string; targetLanguage?: string }) {
    await this.initialize();
    if (!data?.tabId) throw new Error("Tab id is required");
    if (!this.activeView) return;
    const targetUrl = this.activeView.webContents.getURL();
    if (!targetUrl) return;
    const translatedUrl = this.buildTranslatePageUrl({
      targetUrl,
      targetLanguage: data.targetLanguage,
    });
    await this.activeView.webContents.loadURL(translatedUrl);
    return translatedUrl;
  }

  async openManager() {
    await this.initialize();
    if (!this.activeView) return;
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
    const payload = await this.service.openManager(win, this.activeView);
    if (payload) await this.applyManagerState(payload);
    return payload;
  }

  applyManagerState(payload: { preference: ITranslatePreference; recentSelections: ITranslateSelectionHistoryItem[] }) {
    return this.service.applyManagerState(payload);
  }
}

export const translateController = new TranslateController();
