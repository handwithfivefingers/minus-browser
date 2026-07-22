export interface ITranslatePreference {
  sourceLanguage: string
  targetLanguage: string
  autoTranslate: boolean
  alwaysTranslateDomains: string[]
  neverTranslateDomains: string[]
  neverTranslateLanguages: string[]
}

export interface ITranslateDetectResult {
  language: string
  confidence?: number
}

export interface ITranslateSelection {
  tabId: string
  text?: string
  sourceLanguage?: string
  targetLanguage?: string
}
