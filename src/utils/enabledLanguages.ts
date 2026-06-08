import { ALL_AVAILABLE_LANGUAGES, type AvailableLanguage } from '~/constants';

export const normalizeEnabledLanguages = (
  languages: AvailableLanguage[]
): AvailableLanguage[] =>
  ALL_AVAILABLE_LANGUAGES.filter((lang) => languages.includes(lang));

export const getToggledEnabledLanguages = (
  enabledLanguages: AvailableLanguage[],
  language: AvailableLanguage
): AvailableLanguage[] => {
  const toggledLanguages = enabledLanguages.includes(language)
    ? enabledLanguages.filter((lang) => lang !== language)
    : [...enabledLanguages, language];

  return normalizeEnabledLanguages(toggledLanguages);
};

export const isLanguageToggleDisabled = (
  enabledLanguages: AvailableLanguage[],
  language: AvailableLanguage,
  state: boolean
): boolean => {
  const isJapaneseOff = !enabledLanguages.includes('JA');
  const isEnglishOff = !enabledLanguages.includes('EN');
  const shouldDisableJapanese = language === 'JA' && state && isEnglishOff;
  const shouldDisableEnglish = language === 'EN' && state && isJapaneseOff;

  return shouldDisableJapanese || shouldDisableEnglish;
};
