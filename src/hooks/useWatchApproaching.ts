import { useEffect, useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HeaderTransitionState } from '../models/HeaderTransitionState';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import tuningState from '../store/atoms/tuning';
import { isJapanese } from '../translation';
import getNextStation from '../utils/getNextStation';
import getIsPass from '../utils/isPass';
import useValueRef from './useValueRef';

type HeaderState = 'CURRENT' | 'NEXT' | 'ARRIVING';
type HeaderLangState = 'JA' | 'KANA' | 'EN' | 'ZH' | 'KO';

const useWatchApproaching = (): void => {
  const { arrived, approaching, station } = useRecoilValue(stationState);
  const [{ headerState, leftStations, enabledLanguages }, setNavigation] =
    useRecoilState(navigationState);
  const { headerTransitionInterval } = useRecoilValue(tuningState);

  const [intervalId, setIntervalId] = useState<NodeJS.Timer>();
  const headerStateRef = useValueRef(headerState);

  useEffect(() => {
    return (): void => {
      if (intervalId) {
        clearInterval(intervalId);
      }
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
          if (!getIsPass(station)) {
            setNavigation((prev) => ({
              ...prev,
              headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
            }));
          }
          break;
        default:
          break;
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    }
  }, [arrived, headerState, intervalId, setNavigation, station]);

  const isExtraLangAvailable = !!station?.nameZh || !!station?.nameKo;

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
        const nextStation = getNextStation(leftStations, station);

        switch (currentHeaderState) {
          case 'CURRENT':
          case 'NEXT':
            if (!getIsPass(nextStation)) {
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
      }, headerTransitionInterval);
      setIntervalId(interval);
    }
  }, [
    approaching,
    arrived,
    enabledLanguages,
    headerStateRef,
    headerTransitionInterval,
    isExtraLangAvailable,
    leftStations,
    setNavigation,
    station,
  ]);
};

export default useWatchApproaching;
