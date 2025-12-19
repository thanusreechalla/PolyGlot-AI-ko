
export interface Language {
  code: string;
  name: string;
  native: string;
}

export interface TranslationResult {
  translatedText: string;
  detectedLanguage?: string;
  confidence?: number;
}

export interface TranslationHistoryItem {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}
