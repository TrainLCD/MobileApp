import i18n from 'i18n-js';
import memoize from 'lodash/memoize';
import { findBestLanguageTag } from 'react-native-localize';
import * as en from '../assets/translations/en.json';
import * as ja from '../assets/translations/ja.json';

export const translate = memoize(
  (key: string, config?: Record<string, string | number>) =>
    i18n.t(key, config),
  (key: string, config?: unknown) =>
    config ? key + JSON.stringify(config) : key
);

export const setI18nConfig = (): void => {
  const fallback = { languageTag: 'en', isRTL: false };

  const { languageTag } = findBestLanguageTag(['en', 'ja']) || fallback;

  i18n.translations = { en, ja };
  i18n.locale = languageTag;
};

export const isJapanese =
  findBestLanguageTag(['en', 'ja'])?.languageTag === 'ja';
