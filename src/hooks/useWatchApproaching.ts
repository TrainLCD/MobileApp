import { useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import { isJapanese } from '../translation';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

const useWatchApproaching = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const [{ headerState }, setNavigation] = useRecoilState(navigationState);
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
        case 'ARRIVING':
        case 'ARRIVING_KANA':
        case 'ARRIVING_EN':
          setNavigation((prev) => ({
            ...prev,
            headerState: isJapanese ? 'CURRENT' : 'CURRENT_EN',
          }));
          break;
        default:
          break;
      }
      clearInterval(intervalId);
    }
  }, [arrived, headerState, intervalId, setNavigation]);

  useEffect(() => {
    if (approaching && !arrived) {
      const interval = setInterval(() => {
        switch (headerStateRef.current) {
          case 'CURRENT':
          case 'CURRENT_KANA':
          case 'CURRENT_EN':
          case 'NEXT':
          case 'NEXT_KANA':
          case 'NEXT_EN':
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING',
            }));
            break;
          case 'ARRIVING':
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING_KANA',
            }));
            break;
          case 'ARRIVING_KANA':
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING_EN',
            }));
            break;
          case 'ARRIVING_EN':
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING',
            }));
            break;
          default:
            break;
        }
      }, HEADER_CONTENT_TRANSITION_INTERVAL);
      setIntervalId(interval);
    }
  }, [approaching, arrived, headerStateRef, setNavigation]);
};

export default useWatchApproaching;
