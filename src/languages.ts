export const SUPPORTED_LANGUAGES = ['en', 'fr', 'es', 'ru', 'zh', 'ar'] as const;
export type LangCode = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<LangCode, string> = {
  en: 'English',
  fr: 'French',
  es: 'Spanish',
  ru: 'Russian',
  zh: 'Chinese (Simplified)',
  ar: 'Arabic',
};

export const DEEPL_SOURCE: Record<LangCode, string> = {
  en: 'EN',
  fr: 'FR',
  es: 'ES',
  ru: 'RU',
  zh: 'ZH',
  ar: 'AR',
};

export const DEEPL_TARGET: Record<LangCode, string> = {
  en: 'EN-US',
  fr: 'FR',
  es: 'ES',
  ru: 'RU',
  zh: 'ZH-HANS',
  ar: 'AR',
};

export function isLangCode(s: string): s is LangCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(s);
}
