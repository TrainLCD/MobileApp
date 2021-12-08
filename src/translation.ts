import i18n from 'i18n-js';
import memoize from 'lodash/memoize';
import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as RNLocalize from 'react-native-localize';
import { TransformOptions } from 'stream';

export const translate = memoize(
  (key: string, config?: TransformOptions) => i18n.t(key, config),
  (key: string, config?: unknown) =>
    config ? key + JSON.stringify(config) : key
);

export const setI18nConfig = async (): Promise<void> => {
  const translationsDir = await (Platform.OS === 'android'
    ? RNFS.readDirAssets('translations')
    : RNFS.readDir(`${RNFS.MainBundlePath}/translations`));

  const translationPaths: { [key: string]: string } = translationsDir
    .filter(({ isFile, name }) => isFile() && name.endsWith('.json'))
    .reduce((all, { name, path }) => {
      const languageTag = name.replace('.json', '');
      return { ...all, [languageTag]: path };
    }, {});

  // fallback if no available language fits
  const fallback = { languageTag: 'en', isRTL: false };

  const { languageTag } =
    RNLocalize.findBestAvailableLanguage(Object.keys(translationPaths)) ||
    fallback;

  const fileContent = await (Platform.OS === 'android'
    ? RNFS.readFileAssets(translationPaths[languageTag], 'utf8')
    : RNFS.readFile(translationPaths[languageTag], 'utf8'));

  // clear translation cache
  if (translate?.cache?.clear) {
    translate.cache.clear();
  }

  // set i18n-js config
  i18n.translations = { [languageTag]: JSON.parse(fileContent) };
  i18n.locale = languageTag;
};

export const isJapanese =
  RNLocalize.findBestAvailableLanguage(['en', 'ja'])?.languageTag === 'ja';
