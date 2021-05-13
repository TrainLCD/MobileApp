import { useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import { isJapanese } from '../translation';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';
import { HeaderTransitionState } from '../models/HeaderTransitionState';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useWatchApproaching = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [
    { headerState, leftStations, enabledLanguages },
    setNavigation,
  ] = useRecoilState(navigationState);
  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const headerStateRef = useValueRef(headerState);

  useEffect(() => {
    return (): void => {
      clearInterval(intervalId);
    };
  }, [intervalId]);

  useEffect(() => {
    if (arrived) {
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
          if (!station.pass) {
            setNavigation((prev) => ({
              ...prev,
              headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
            }));
          }
          break;
        default:
          break;
      }
      clearInterval(intervalId);
    }
  }, [arrived, headerState, intervalId, setNavigation, station]);

  const isExtraLangAvailable =
    !!leftStations[0]?.nameZh || !!leftStations[0]?.nameKo;

  useEffect(() => {
    if (approaching && !arrived) {
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
          currentLangIndex !== -1
            ? enabledLanguages[currentLangIndex + 1]
            : null;

        switch (currentHeaderState) {
          case 'CURRENT':
          case 'NEXT':
            if (!leftStations[1].pass) {
              setNavigation((prev) => ({
                ...prev,
                headerState: 'ARRIVING',
              }));
            }
            break;
          case 'ARRIVING':
            switch (currentHeaderStateLang) {
              case 'JA':
                setNavigation((prev) => ({
                  ...prev,
                  headerState: 'ARRIVING_KANA',
                }));
                break;
              default:
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
            break;
          default:
            break;
        }
      }, HEADER_CONTENT_TRANSITION_INTERVAL);
      setIntervalId(interval);
    }
  }, [
    approaching,
    arrived,
    enabledLanguages,
    headerStateRef,
    isExtraLangAvailable,
    leftStations,
    setNavigation,
  ]);
};

export default useWatchApproaching;
