import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import { ALL_AVAILABLE_LANGUAGES, type AvailableLanguage } from '~/constants';
import type { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
import tuningState from '../store/atoms/tuning';
import { isJapanese } from '../translation';
import getIsPass from '../utils/isPass';
import { useCurrentStation } from './useCurrentStation';
import { useInterval } from './useInterval';
import { useIsPassing } from './useIsPassing';
import { useNextStation } from './useNextStation';
import { useValueRef } from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

/**
 * 指定した言語で駅名が利用可能かチェック
 */
const hasStationTextForLang = (
  station: Station | undefined,
  lang: HeaderLangState
): boolean => {
  if (!station) {
    return false;
  }
  switch (lang) {
    case 'JA':
      return !!station.name;
    case 'KANA':
      return !!station.nameKatakana;
    case 'EN':
      return !!station.nameRoman;
    case 'ZH':
      return !!station.nameChinese;
    case 'KO':
      return !!station.nameKorean;
    default:
      return false;
  }
};

/**
 * 次に利用可能な言語を取得（駅名が空の言語はスキップ）
 */
const getNextAvailableLang = (
  currentLang: HeaderLangState,
  enabledLanguages: AvailableLanguage[],
  targetStation: Station | undefined
): HeaderLangState | null => {
  if (enabledLanguages.length <= 1) {
    return null;
  }

  const normalizedCurrentLang = currentLang !== 'KANA' ? currentLang : 'JA';
  const currentIndex = enabledLanguages.indexOf(
    normalizedCurrentLang as AvailableLanguage
  );

  // 現在の言語の次から循環して探索
  for (let i = 1; i < enabledLanguages.length; i++) {
    const nextIndex =
      currentIndex >= 0 ? (currentIndex + i) % enabledLanguages.length : i - 1;
    const lang = enabledLanguages[nextIndex] as HeaderLangState;
    if (hasStationTextForLang(targetStation, lang)) {
      return lang;
    }
  }

  // 見つからなければnull（JAに戻る）
  return null;
};

const getDefaultHeaderLang = (
  enabledLanguages: AvailableLanguage[]
): AvailableLanguage => {
  if (enabledLanguages.includes('JA')) {
    return 'JA';
  }
  return enabledLanguages[0] || 'EN';
};

const toHeaderTransitionState = (
  headerState: HeaderState,
  lang: HeaderLangState
): HeaderTransitionState => {
  if (lang === 'JA') {
    return headerState as HeaderTransitionState;
  }
  return `${headerState}_${lang}` as HeaderTransitionState;
};

const getFallbackStateWithoutJapanese = (
  headerState: HeaderState,
  currentLang: HeaderLangState,
  enabledLanguages: AvailableLanguage[]
): HeaderTransitionState => {
  const fallbackLang =
    currentLang === 'JA' || currentLang === 'KANA'
      ? getDefaultHeaderLang(enabledLanguages)
      : (currentLang as AvailableLanguage);
  return toHeaderTransitionState(headerState, fallbackLang);
};

export const useTransitionHeaderState = (): void => {
  const { arrived, approaching, selectedBound } = useAtomValue(stationState);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const [
    {
      headerState,
      enabledLanguages: enabledLanguagesFromState,
      stationForHeader,
    },
    setNavigation,
  ] = useAtom(navigationState);
  const { headerTransitionInterval } = useAtomValue(tuningState);
  const station = useCurrentStation();

  const headerStateRef = useValueRef(headerState);

  const nextStation = useNextStation();
  const isPassing = useIsPassing();

  const enabledLanguages = useMemo<AvailableLanguage[]>(() => {
    const orderedEnabledLanguages = ALL_AVAILABLE_LANGUAGES.filter((lang) =>
      enabledLanguagesFromState.includes(lang)
    );
    if (isLEDTheme) {
      return orderedEnabledLanguages.filter(
        (lang) => lang === 'JA' || lang === 'EN'
      );
    }
    return orderedEnabledLanguages;
  }, [enabledLanguagesFromState, isLEDTheme]);
  const isJapaneseEnabled = enabledLanguages.includes('JA');
  const showNextExpression = useMemo(() => {
    // 次の停車駅が存在しない場合無条件でfalse
    // 停車中は等前ながらfalse
    if (!nextStation || arrived) {
      return false;
    }
    // 最寄駅が通過駅の場合は無条件でtrue
    if (station && getIsPass(station)) {
      return true;
    }
    // 急行停車駅発車直後trueにする
    if (stationForHeader?.id === station?.id && !arrived) {
      return true;
    }
    // 地理的な最寄り駅と次の停車駅が違う場合場合 かつ 次の停車駅に近づいていなければtrue
    if (stationForHeader?.id !== station?.id && !approaching) {
      return true;
    }
    // 地理的な最寄り駅と次の停車駅が同じ場合に到着していない かつ 接近もしていない場合true
    return !arrived && !approaching;
  }, [approaching, arrived, nextStation, station, stationForHeader?.id]);

  const isExtraLangAvailable = useMemo(
    () => !!station?.nameChinese || !!station?.nameKorean,
    [station?.nameChinese, station?.nameKorean]
  );

  useEffect(() => {
    if (arrived && !getIsPass(station)) {
      switch (headerState) {
        case 'NEXT':
        case 'NEXT_KANA':
        case 'NEXT_EN':
        case 'NEXT_ZH':
        case 'NEXT_KO':
        case 'ARRIVING':
        case 'ARRIVING_KANA':
        case 'ARRIVING_EN':
        case 'ARRIVING_ZH':
        case 'ARRIVING_KO':
          if (!enabledLanguages.length) {
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: toHeaderTransitionState(
              'CURRENT',
              isJapanese && isJapaneseEnabled
                ? 'JA'
                : getDefaultHeaderLang(enabledLanguages)
            ),
          }));
          break;
        default:
          break;
      }
    }
  }, [
    arrived,
    enabledLanguages,
    headerState,
    isJapaneseEnabled,
    setNavigation,
    station,
  ]);

  useEffect(() => {
    if (isJapaneseEnabled || !enabledLanguages.length) {
      return;
    }
    const [stoppingState, langState] = headerState.split('_') as [
      HeaderState,
      HeaderLangState | undefined,
    ];
    if (langState && langState !== 'KANA') {
      return;
    }
    setNavigation((prev) => ({
      ...prev,
      headerState: toHeaderTransitionState(
        stoppingState,
        getDefaultHeaderLang(enabledLanguages)
      ),
    }));
  }, [enabledLanguages, headerState, isJapaneseEnabled, setNavigation]);

  useInterval(
    useCallback(() => {
      if (!selectedBound) {
        return;
      }

      const currentHeaderState = headerStateRef.current.split(
        '_'
      )[0] as HeaderState;
      const currentHeaderStateLang =
        (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA';

      // ヘッダー状態に応じてチェック対象の駅を決定
      const targetStation =
        currentHeaderState === 'CURRENT' ? station : nextStation;

      // 駅名が存在する次の言語を取得（空の言語はスキップ）
      const nextLang = getNextAvailableLang(
        currentHeaderStateLang,
        enabledLanguages,
        targetStation
      );

      switch (currentHeaderState) {
        case 'ARRIVING': {
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                if (!nextLang) {
                  setNavigation((prev) => ({
                    ...prev,
                    headerState: 'ARRIVING',
                  }));
                  break;
                }
                setNavigation((prev) => ({
                  ...prev,
                  headerState: toHeaderTransitionState('ARRIVING', nextLang),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }));
              break;
            default:
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: isJapaneseEnabled
                    ? 'ARRIVING'
                    : getFallbackStateWithoutJapanese(
                        'ARRIVING',
                        currentHeaderStateLang,
                        enabledLanguages
                      ),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: toHeaderTransitionState('ARRIVING', nextLang),
              }));
              break;
          }
          break;
        }
        case 'CURRENT': {
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: isJapaneseEnabled
                ? 'NEXT'
                : getFallbackStateWithoutJapanese(
                    'NEXT',
                    currentHeaderStateLang,
                    enabledLanguages
                  ),
            }));
            break;
          }
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                if (isPassing) {
                  break;
                }
                if (!nextLang) {
                  setNavigation((prev) => ({
                    ...prev,
                    headerState: getFallbackStateWithoutJapanese(
                      'CURRENT',
                      currentHeaderStateLang,
                      enabledLanguages
                    ),
                  }));
                  break;
                }
                setNavigation((prev) => ({
                  ...prev,
                  headerState: toHeaderTransitionState('CURRENT', nextLang),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: 'CURRENT_KANA',
              }));
              break;
            default:
              if (isPassing) {
                break;
              }
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: isJapaneseEnabled
                    ? 'CURRENT'
                    : getFallbackStateWithoutJapanese(
                        'CURRENT',
                        currentHeaderStateLang,
                        enabledLanguages
                      ),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: toHeaderTransitionState('CURRENT', nextLang),
              }));
              break;
          }
          break;
        }
        case 'NEXT': {
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                if (!nextLang) {
                  setNavigation((prev) => ({
                    ...prev,
                    headerState: getFallbackStateWithoutJapanese(
                      'NEXT',
                      currentHeaderStateLang,
                      enabledLanguages
                    ),
                  }));
                  break;
                }
                setNavigation((prev) => ({
                  ...prev,
                  headerState: toHeaderTransitionState('NEXT', nextLang),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: 'NEXT_KANA',
              }));
              break;
            default:
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: isJapaneseEnabled
                    ? 'NEXT'
                    : getFallbackStateWithoutJapanese(
                        'NEXT',
                        currentHeaderStateLang,
                        enabledLanguages
                      ),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: toHeaderTransitionState('NEXT', nextLang),
              }));
              break;
          }
          break;
        }
        default:
          break;
      }

      if (approaching) {
        switch (currentHeaderState) {
          case 'CURRENT':
          case 'NEXT':
            if (nextStation) {
              setNavigation((prev) => ({
                ...prev,
                headerState: isJapaneseEnabled
                  ? 'ARRIVING'
                  : getFallbackStateWithoutJapanese(
                      'ARRIVING',
                      currentHeaderStateLang,
                      enabledLanguages
                    ),
              }));
            }
            break;
          case 'ARRIVING': {
            if (currentHeaderStateLang === 'JA') {
              if (!isJapaneseEnabled) {
                if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
                  setNavigation((prev) => ({
                    ...prev,
                    headerState: getFallbackStateWithoutJapanese(
                      'ARRIVING',
                      currentHeaderStateLang,
                      enabledLanguages
                    ),
                  }));
                  break;
                }
                setNavigation((prev) => ({
                  ...prev,
                  headerState: toHeaderTransitionState('ARRIVING', nextLang),
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }));
              break;
            }

            if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
              setNavigation((prev) => ({
                ...prev,
                headerState: isJapaneseEnabled
                  ? 'ARRIVING'
                  : getFallbackStateWithoutJapanese(
                      'ARRIVING',
                      currentHeaderStateLang,
                      enabledLanguages
                    ),
              }));
              break;
            }
            setNavigation((prev) => ({
              ...prev,
              headerState: toHeaderTransitionState('ARRIVING', nextLang),
            }));
            break;
          }
          default:
            break;
        }
      }
    }, [
      approaching,
      enabledLanguages,
      headerStateRef,
      isJapaneseEnabled,
      isExtraLangAvailable,
      isPassing,
      nextStation,
      selectedBound,
      setNavigation,
      showNextExpression,
      station,
    ]),
    headerTransitionInterval
  );
};
