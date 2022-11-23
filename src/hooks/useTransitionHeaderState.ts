import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import useValueRef from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [
    { headerState, leftStations, enabledLanguages, stationForHeader },
    setNavigation,
  ] = useRecoilState(navigationState);
  const { headerTransitionInterval } = useRecoilValue(tuningState);

  const headerStateRef = useValueRef(headerState);
  const intervalId = useRef<number>();

  const enabledLanguagesRef = useRef(enabledLanguages);

  const nextStation = useMemo(
    () => getNextStation(leftStations, station),
    [leftStations, station]
  );
  const showNextExpression = useMemo(() => {
    // 次の停車駅が存在しない場合無条件でfalse
    if (!nextStation) {
      return false;
    }
    // 最寄駅が通過駅の場合は無条件でtrue
    if (getIsPass(station)) {
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

  const showNextExpressionRef = useValueRef(showNextExpression);

  useFocusEffect(
    useCallback(() => {
      return (): void => {
        if (intervalId.current) {
          clearInterval(intervalId.current);
        }
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (intervalId.current) {
        return;
      }
      const interval = setInterval(() => {
        const currentHeaderState = headerStateRef.current.split(
          '_'
        )[0] as HeaderState;
        const currentHeaderStateLang =
          (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA';
        const currentLangIndex = enabledLanguagesRef.current.indexOf(
          currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
        );
        const nextLang =
          currentLangIndex !== -1
            ? enabledLanguagesRef.current[currentLangIndex + 1]
            : null;

        switch (currentHeaderState) {
          case 'CURRENT': {
            if (showNextExpressionRef.current) {
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
      }, headerTransitionInterval);
      intervalId.current = interval;
    }, [
      headerStateRef,
      headerTransitionInterval,
      setNavigation,
      showNextExpressionRef,
    ])
  );
};

export default useTransitionHeaderState;
