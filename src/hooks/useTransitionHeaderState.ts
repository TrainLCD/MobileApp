import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import useValueRef from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [{ headerState, leftStations, enabledLanguages }, setNavigation] =
    useRecoilState(navigationState);
  const headerStateRef = useValueRef(headerState);
  const intervalId = useRef<NodeJS.Timer>();

  const enabledLanguagesRef = useRef(enabledLanguages);

  const nextStation = useMemo(
    () => getNextStation(leftStations, station),
    [leftStations, station]
  );
  const showNextExpression = useMemo(
    () => !arrived && !approaching && !!nextStation,
    [approaching, arrived, nextStation]
  );
  const showNextExpressionRef = useRef(showNextExpression);

  const isCurrentStationExtraLangAvailable = useMemo(
    () => station?.nameZh?.length && station?.nameKo?.length,
    [station?.nameKo?.length, station?.nameZh?.length]
  );
  const isCurrentStationExtraLangAvailableRef = useRef(
    isCurrentStationExtraLangAvailable
  );
  const isNextStationExtraLangAvailable = useMemo(
    () => nextStation?.nameZh?.length && nextStation?.nameKo?.length,
    [nextStation?.nameKo?.length, nextStation?.nameZh?.length]
  );
  const isNextStationExtraLangAvailableRef = useRef(
    isNextStationExtraLangAvailable
  );

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
                if (getIsPass(station)) {
                  setNavigation((prev) => ({
                    ...prev,
                    headerState: 'NEXT',
                  }));
                  break;
                }
                if (
                  !nextLang ||
                  (nextLang !== 'EN' &&
                    !isCurrentStationExtraLangAvailableRef.current)
                ) {
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
                if (
                  !nextLang ||
                  (nextLang !== 'EN' &&
                    !isNextStationExtraLangAvailableRef.current)
                ) {
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
      }, HEADER_CONTENT_TRANSITION_INTERVAL);
      intervalId.current = interval;
    }, [headerStateRef, setNavigation, station])
  );
};

export default useTransitionHeaderState;
