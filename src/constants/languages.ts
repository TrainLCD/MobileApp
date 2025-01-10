export type AvailableLanguage = 'JA' | 'EN' | 'ZH' | 'KO';
export type AvailableLanguageObj = {
  code: AvailableLanguage;
  priority: number;
};

export const ALL_AVAILABLE_LANGUAGES: AvailableLanguage[] = [
  'JA',
  'EN',
  'ZH',
  'KO',
];

export const ALL_AVAILABLE_LANGUAGES_WITH_PRIORITY: AvailableLanguageObj[] =
  ALL_AVAILABLE_LANGUAGES.map((code, priority) => ({
    code,
    priority,
  }));
