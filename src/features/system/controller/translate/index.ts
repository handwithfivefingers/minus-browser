import { ITranslatePreference, ITranslateSelectionHistoryItem } from "../../interfaces/translate";
import { TranslateService } from "../../services/translate.service";

export class TranslateController {
  constructor(private readonly service: TranslateService = new TranslateService()) {}

  async initialize() {
    await this.service.initialize();
  }

  getPreference() {
    return this.service.getPreference();
  }

  getRecentSelections() {
    return this.service.getRecentSelections();
  }

  savePreference(patch: Partial<ITranslatePreference>) {
    return this.service.savePreference(patch);
  }

  detectLanguage(text: string) {
    return this.service.detectLanguage(text);
  }

  shouldAutoTranslate(domain: string, language?: string) {
    return this.service.shouldAutoTranslate(domain, language);
  }

  translateSelection(input: { tabId: string; text: string; sourceLanguage?: string; targetLanguage?: string }) {
    return this.service.translateSelection(input);
  }

  buildTranslatePageUrl(input: { targetUrl: string; targetLanguage?: string }) {
    return this.service.buildGoogleTranslateUrl(input);
  }

  openManager(...args: Parameters<TranslateService["openManager"]>) {
    return this.service.openManager(...args);
  }

  applyManagerState(payload: { preference: ITranslatePreference; recentSelections: ITranslateSelectionHistoryItem[] }) {
    return this.service.applyManagerState(payload);
  }
}
