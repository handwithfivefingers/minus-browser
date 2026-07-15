export interface ITranslatePreference {
  sourceLanguage: string;
  targetLanguage: string;
  autoTranslate: boolean;
  alwaysTranslateDomains: string[];
  neverTranslateDomains: string[];
  neverTranslateLanguages: string[];
}

export interface ITranslateDetectResult {
  language: string;
  confidence?: number;
}
