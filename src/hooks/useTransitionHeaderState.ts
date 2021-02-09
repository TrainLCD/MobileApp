import { useState, useEffect } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import { HEADER_CONTENT_TRANSITION_INTERVAL } from '../constants';
import useValueRef from './useValueRef';
import stationState from '../store/atoms/station';
import navigationState from '../store/atoms/navigation';

const useTransitionHeaderState = (): void => {
  const { arrived } = useRecoilValue(stationState);
  const [{ headerState, leftStations }, setNavigation] = useRecoilState(
    navigationState
  );
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout>();
  const headerStateRef = useValueRef(headerState);
  const leftStationsRef = useValueRef(leftStations);
  const arrivedRef = useValueRef(arrived);

  useEffect(() => {
    return (): void => clearInterval(intervalId);
  }, [intervalId]);

  useEffect(() => {
    const interval = setInterval(() => {
      switch (headerStateRef.current) {
        case 'CURRENT':
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: 'CURRENT_KANA',
          }));
          break;
        case 'CURRENT_KANA':
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
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
          if (leftStationsRef.current.length > 1 && !arrivedRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
            break;
          }
          setNavigation((prev) => ({
            ...prev,
            headerState: 'CURRENT',
          }));
          break;
        case 'NEXT':
          if (arrivedRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'CURRENT',
            }));
          } else {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT_KANA',
            }));
          }
          break;
        case 'NEXT_KANA':
          if (arrivedRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'CURRENT_EN',
            }));
          } else {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT_EN',
            }));
          }
          break;
        case 'NEXT_EN':
          if (arrivedRef.current) {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'CURRENT',
            }));
          } else {
            setNavigation((prev) => ({
              ...prev,
              headerState: 'NEXT',
            }));
          }
          break;
        default:
          break;
      }
    }, HEADER_CONTENT_TRANSITION_INTERVAL);
    setIntervalId(interval);
  }, [arrivedRef, headerStateRef, leftStationsRef, setNavigation]);
};

export default useTransitionHeaderState;
