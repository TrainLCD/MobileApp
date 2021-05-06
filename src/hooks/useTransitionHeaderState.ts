import { useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

const useTransitionHeaderState = (): void => {
  const { arrived, approaching } = useRecoilValue(stationState);
  const [
    { headerState, leftStations, stationForHeader },
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

  useEffect(() => {
    const interval = setInterval(() => {
      switch (headerStateRef.current) {
        case 'CURRENT':
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          if (approaching) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING',
            }));
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: 'CURRENT_KANA',
          }));
          break;
        case 'CURRENT_KANA':
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT_EN',
            }));
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: 'CURRENT_EN',
          }));
          break;
        case 'CURRENT_EN':
          if (showNextExpression) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          if (approaching) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'ARRIVING',
            }));
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: 'CURRENT',
          }));
          break;
        case 'NEXT':
          setNavigation((prev) => ({
            ...prev,
            headerState: 'NEXT_KANA',
          }));
          break;
        case 'NEXT_KANA':
          setNavigation((prev) => ({
            ...prev,
            headerState: 'NEXT_EN',
          }));
          break;
        case 'NEXT_EN':
          setNavigation((prev) => ({
            ...prev,
            headerState: 'NEXT',
          }));
          break;
        default:
          break;
      }
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [approaching, headerStateRef, setNavigation, showNextExpression]);
};

export default useTransitionHeaderState;
