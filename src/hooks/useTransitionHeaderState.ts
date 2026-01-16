import { useAtom, useAtomValue } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';
import type { Station } from '~/@types/graphql';
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
  enabledLanguages: string[],
  targetStation: Station | undefined
): HeaderLangState | null => {
  const currentIndex = enabledLanguages.indexOf(
    currentLang !== 'KANA' ? currentLang : 'JA'
  );

  // 現在の言語から後ろを順に探す
  for (let i = currentIndex + 1; i < enabledLanguages.length; i++) {
    const lang = enabledLanguages[i] as HeaderLangState;
    if (hasStationTextForLang(targetStation, lang)) {
      return lang;
    }
  }

  // 見つからなければnull（JAに戻る）
  return null;
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

  const enabledLanguages = useMemo(
    () => (isLEDTheme ? ['JA', 'EN'] : enabledLanguagesFromState),
    [enabledLanguagesFromState, isLEDTheme]
  );
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
          setNavigation((prev) => ({
            ...prev,
            headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
          }));
          break;
        default:
          break;
      }
    }
  }, [arrived, headerState, setNavigation, station]);

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
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }));
              break;
            default:
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'ARRIVING',
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `ARRIVING_${nextLang}` as HeaderTransitionState,
              }));
              break;
          }
          break;
        }
        case 'CURRENT': {
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          switch (currentHeaderStateLang) {
            case 'JA':
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
                  headerState: 'CURRENT',
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `CURRENT_${nextLang}` as HeaderTransitionState,
              }));
              break;
          }
          break;
        }
        case 'NEXT': {
          switch (currentHeaderStateLang) {
            case 'JA':
              setNavigation((prev) => ({
                ...prev,
                headerState: 'NEXT_KANA',
              }));
              break;
            default:
              if (!nextLang) {
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'NEXT',
                }));
                break;
              }
              setNavigation((prev) => ({
                ...prev,
                headerState: `NEXT_${nextLang}` as HeaderTransitionState,
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
                headerState: 'ARRIVING',
              }));
            }
            break;
          case 'ARRIVING': {
            if (currentHeaderStateLang === 'JA') {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING_KANA',
              }));
              break;
            }

            if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING',
              }));
              break;
            }
            setNavigation((prev) => ({
              ...prev,
              headerState: `ARRIVING_${nextLang}` as HeaderTransitionState,
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
