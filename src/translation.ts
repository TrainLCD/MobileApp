import * as RNLocalize from 'react-native-localize';
import memoize from 'lodash/memoize';
import i18n from 'i18n-js';
import jaDic from './web/translations/ja.json';
import enDic from './web/translations/en.json';

export const translate = memoize(
  (key: string, config?: unknown) => i18n.t(key, config),
  (key: string, config?: unknown) =>
    config ? key + JSON.stringify(config) : key
);

export const setI18nConfig = async (): Promise<void> => {
  // clear translation cache
  translate.cache.clear();

  // set i18n-js config
  i18n.translations = { ja: jaDic, en: enDic };
  const [lang] = window.navigator.language.split('-');
  i18n.locale = lang;
};

export const isJapanese =
  RNLocalize.findBestAvailableLanguage(['en', 'ja']).languageTag === 'ja';
