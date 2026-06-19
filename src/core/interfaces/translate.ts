export interface ITranslatePreference {
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
  neverTranslateLanguages: string[];
}

export interface ITranslateSelectionHistoryItem {
  id: string;
  tabId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
}

export interface ITranslateStore {
  preference: ITranslatePreference;
  recentSelections: ITranslateSelectionHistoryItem[];
}

export interface ITranslateDetectResult {
  language: string;
  confidence?: number;
}
