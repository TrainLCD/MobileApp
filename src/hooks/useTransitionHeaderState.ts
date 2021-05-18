import { useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';
import { HeaderTransitionState } from '../models/HeaderTransitionState';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const [
    { headerState, leftStations, stationForHeader, enabledLanguages },
    setNavigation,
  ] = useRecoilState(navigationState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const headerStateRef = useValueRef(headerState);

  useEffect(() => {
    return (): void => clearInterval(intervalId);
  }, [intervalId]);

  const showNextExpression =
    leftStations.length > 1 &&
    (!arrived || leftStations[0]?.id !== stationForHeader.id) &&
    !approaching;

  const isExtraLangAvailable =
    !!leftStations[0]?.nameZh || !!leftStations[0]?.nameKo;

  useEffect(() => {
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
              if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
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
              if (!nextLang || (nextLang !== 'EN' && !isExtraLangAvailable)) {
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
    setIntervalId(interval);
  }, [
    enabledLanguages,
    headerStateRef,
    isExtraLangAvailable,
    setNavigation,
    showNextExpression,
  ]);
};

export default useTransitionHeaderState;
