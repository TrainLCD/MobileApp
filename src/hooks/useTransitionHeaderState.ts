import { useEffect, useRef } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getNextStation from '../utils/getNextStation';
import useValueRef from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [
    { headerState, leftStations, stationForHeader, enabledLanguages },
    setNavigation,
  ] = useRecoilState(navigationState);
  const headerStateRef = useValueRef(headerState);
  const intervalIdRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    return (): void => {
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
      }
    };
  }, [intervalIdRef]);

  const showNextExpression =
    leftStations.length > 1 &&
    (!arrived || station?.id !== stationForHeader?.id) &&
    !approaching;

  const nextStation = getNextStation(leftStations, station);

  const isCurrentStationExtraLangAvailable =
    station?.nameZh?.length && station?.nameKo?.length;
  const isNextStationExtraLangAvailable =
    nextStation?.nameZh?.length && nextStation?.nameKo?.length;

  useEffect(() => {
    if (intervalIdRef.current) {
      return;
    }

    const interval = setInterval(() => {
      const currentHeaderState = headerStateRef.current.split(
        '_'
      )[0] as HeaderState;
      const currentHeaderStateLang =
        (headerStateRef.current.split('_')[1] as HeaderLangState) || 'JA';
      const currentLangIndex = enabledLanguages.indexOf(
        currentHeaderStateLang !== 'KANA' ? currentHeaderStateLang : 'JA'
      );
      const nextLang =
        currentLangIndex !== -1 ? enabledLanguages[currentLangIndex + 1] : null;

      switch (currentHeaderState) {
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
              if (
                !nextLang ||
                (nextLang !== 'EN' && !isCurrentStationExtraLangAvailable)
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
                (nextLang !== 'EN' && !isNextStationExtraLangAvailable)
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
    intervalIdRef.current = interval;
  }, [
    enabledLanguages,
    headerStateRef,
    isCurrentStationExtraLangAvailable,
    isNextStationExtraLangAvailable,
    setNavigation,
    showNextExpression,
  ]);
};

export default useTransitionHeaderState;
