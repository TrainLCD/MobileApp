import { useAtomValue, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import {
  ALL_AVAILABLE_LANGUAGES,
  type AvailableLanguage,
  DEFAULT_HEADER_TRANSITION_INTERVAL,
} from '~/constants';
import type { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState, {
  enabledLanguagesAtom,
  headerStateAtom,
  stationForHeaderAtom,
} from '../store/atoms/navigation';
import {
  approachingAtom,
  arrivedAtom,
  selectedBoundAtom,
} from '../store/atoms/station';
import { isLEDThemeAtom } from '../store/atoms/theme';
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
  const arrived = useAtomValue(arrivedAtom);
  const approaching = useAtomValue(approachingAtom);
  const selectedBound = useAtomValue(selectedBoundAtom);
  const isLEDTheme = useAtomValue(isLEDThemeAtom);
  const headerState = useAtomValue(headerStateAtom);
  const enabledLanguagesFromState = useAtomValue(enabledLanguagesAtom);
  const stationForHeader = useAtomValue(stationForHeaderAtom);
  const setNavigation = useSetAtom(navigationState);
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
    if (!nextStation) {
      return false;
    }
    // 最寄駅が通過駅の場合は無条件でtrue（到着中でも次の駅を表示）
    if (station && getIsPass(station)) {
      return true;
    }
    // 停車中はfalse
    if (arrived) {
      return false;
    }
    // 急行停車駅発車直後trueにする
    if (stationForHeader?.id === station?.id) {
      return true;
    }
    // 地理的な最寄り駅と次の停車駅が違う場合 かつ 次の停車駅に近づいていなければtrue
    if (stationForHeader?.id !== station?.id && !approaching) {
      return true;
    }
    // 接近していない場合true
    return !approaching;
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

  // 同一の headerState を毎秒書き込むと「内容は変わらないが新オブジェクト」が
  // navigationState に流れ、jotai の購読者すべてが再描画される。
  // このヘルパーで「変化があった時だけ」更新するようにする。
  const setHeaderStateIfChanged = useCallback(
    (next: HeaderTransitionState) => {
      setNavigation((prev) =>
        prev.headerState === next ? prev : { ...prev, headerState: next }
      );
    },
    [setNavigation]
  );

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

      // 接近が解除されたのに ARRIVING のまま貼り付くのを防ぐ。
      // ARRIVING からの離脱は本来 arrived のリセット useEffect でしか起きないため、
      // 到着を挟まず approaching が true→false に戻るケース(到着検知の取りこぼし・
      // GPS補正・接近駅の切替など)では「まもなく」が解除されず、displayNextStation が
      // 記録基準の次駅へフォールバックして「まもなく(遠い駅)」と誤表示され続ける。
      // 未到着で接近も解除されたら NEXT/CURRENT へ明示的に戻す。
      if (!approaching && !arrived && currentHeaderState === 'ARRIVING') {
        const fallbackState = showNextExpression ? 'NEXT' : 'CURRENT';
        setHeaderStateIfChanged(
          isJapaneseEnabled
            ? fallbackState
            : getFallbackStateWithoutJapanese(
                fallbackState,
                currentHeaderStateLang,
                enabledLanguages
              )
        );
        return;
      }

      switch (currentHeaderState) {
        case 'ARRIVING': {
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                setHeaderStateIfChanged(
                  nextLang
                    ? toHeaderTransitionState('ARRIVING', nextLang)
                    : 'ARRIVING'
                );
                break;
              }
              setHeaderStateIfChanged('ARRIVING_KANA');
              break;
            default:
              setHeaderStateIfChanged(
                nextLang
                  ? toHeaderTransitionState('ARRIVING', nextLang)
                  : isJapaneseEnabled
                    ? 'ARRIVING'
                    : getFallbackStateWithoutJapanese(
                        'ARRIVING',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
              );
              break;
          }
          break;
        }
        case 'CURRENT': {
          if (showNextExpression) {
            setHeaderStateIfChanged(
              isJapaneseEnabled
                ? 'NEXT'
                : getFallbackStateWithoutJapanese(
                    'NEXT',
                    currentHeaderStateLang,
                    enabledLanguages
                  )
            );
            break;
          }
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                if (isPassing) {
                  break;
                }
                setHeaderStateIfChanged(
                  nextLang
                    ? toHeaderTransitionState('CURRENT', nextLang)
                    : getFallbackStateWithoutJapanese(
                        'CURRENT',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
                );
                break;
              }
              setHeaderStateIfChanged('CURRENT_KANA');
              break;
            default:
              if (isPassing) {
                break;
              }
              setHeaderStateIfChanged(
                nextLang
                  ? toHeaderTransitionState('CURRENT', nextLang)
                  : isJapaneseEnabled
                    ? 'CURRENT'
                    : getFallbackStateWithoutJapanese(
                        'CURRENT',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
              );
              break;
          }
          break;
        }
        case 'NEXT': {
          switch (currentHeaderStateLang) {
            case 'JA':
              if (!isJapaneseEnabled) {
                setHeaderStateIfChanged(
                  nextLang
                    ? toHeaderTransitionState('NEXT', nextLang)
                    : getFallbackStateWithoutJapanese(
                        'NEXT',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
                );
                break;
              }
              setHeaderStateIfChanged('NEXT_KANA');
              break;
            default:
              setHeaderStateIfChanged(
                nextLang
                  ? toHeaderTransitionState('NEXT', nextLang)
                  : isJapaneseEnabled
                    ? 'NEXT'
                    : getFallbackStateWithoutJapanese(
                        'NEXT',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
              );
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
              setHeaderStateIfChanged(
                isJapaneseEnabled
                  ? 'ARRIVING'
                  : getFallbackStateWithoutJapanese(
                      'ARRIVING',
                      currentHeaderStateLang,
                      enabledLanguages
                    )
              );
            }
            break;
          case 'ARRIVING': {
            const canUseNextLang =
              nextLang && (nextLang === 'EN' || isExtraLangAvailable);
            if (currentHeaderStateLang === 'JA') {
              if (!isJapaneseEnabled) {
                setHeaderStateIfChanged(
                  canUseNextLang
                    ? toHeaderTransitionState('ARRIVING', nextLang)
                    : getFallbackStateWithoutJapanese(
                        'ARRIVING',
                        currentHeaderStateLang,
                        enabledLanguages
                      )
                );
                break;
              }
              setHeaderStateIfChanged('ARRIVING_KANA');
              break;
            }
            setHeaderStateIfChanged(
              canUseNextLang
                ? toHeaderTransitionState('ARRIVING', nextLang)
                : isJapaneseEnabled
                  ? 'ARRIVING'
                  : getFallbackStateWithoutJapanese(
                      'ARRIVING',
                      currentHeaderStateLang,
                      enabledLanguages
                    )
            );
            break;
          }
          default:
            break;
        }
      }
    }, [
      approaching,
      arrived,
      enabledLanguages,
      headerStateRef,
      isJapaneseEnabled,
      isExtraLangAvailable,
      isPassing,
      nextStation,
      selectedBound,
      setHeaderStateIfChanged,
      showNextExpression,
      station,
    ]),
    DEFAULT_HEADER_TRANSITION_INTERVAL
  );
};
