import * as FileSystem from 'expo-file-system'
import i18n from 'i18n-js'
import memoize from 'lodash/memoize'
import * as RNLocalize from 'react-native-localize'

export const translate = memoize(
  (key: string, config?: Record<string, string | number>) =>
    i18n.t(key, config),
  (key: string, config?: unknown) =>
    config ? key + JSON.stringify(config) : key
)

export const setI18nConfig = async (): Promise<void> => {
  const translationsDir = `${FileSystem.bundleDirectory}/translations`
  const translationsDirFiles = await FileSystem.readDirectoryAsync(
    translationsDir
  )

  const translationPaths: { [key: string]: string } =
    translationsDirFiles.reduce((all, fileName) => {
      const languageTag = fileName.replace('.json', '')
      return { ...all, [languageTag]: `${translationsDir}/${fileName}` }
    }, {})

  // fallback if no available language fits
  const fallback = { languageTag: 'en', isRTL: false }

  const { languageTag } =
    RNLocalize.findBestAvailableLanguage(Object.keys(translationPaths)) ||
    fallback

  const fileContent = await FileSystem.readAsStringAsync(
    translationPaths[languageTag]
  )

  // set i18n-js config
  i18n.translations = { [languageTag]: JSON.parse(fileContent) }
  i18n.locale = languageTag
}

export const isJapanese =
  RNLocalize.findBestAvailableLanguage(['en', 'ja'])?.languageTag === 'ja'
