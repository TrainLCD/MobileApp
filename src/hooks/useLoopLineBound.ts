import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import {
  inboundStationForLoopLine,
  isMeijoLine,
  outboundStationForLoopLine,
} from '../utils/loopLine';
import useCurrentLine from './useCurrentLine';

const useLoopLineBound = (
  reflectHeaderLanguage = true
): { boundFor: string; station?: Station } | null => {
  const { headerState } = useRecoilValue(navigationState);
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const currentLine = useCurrentLine();

  const currentIndex = getCurrentStationIndex(stations, station);
  const headerLangState = headerState.split('_')[1] as HeaderLangState;
  const fixedHeaderLangState: HeaderLangState = isJapanese ? '' : 'EN';

  const meijoLineBound = useMemo(() => {
    if (!reflectHeaderLanguage) {
      switch (selectedDirection) {
        case 'INBOUND':
          return {
            boundFor: isJapanese ? '右回り' : 'Clockwise',
          };
        case 'OUTBOUND':
          return {
            boundFor: isJapanese ? '左回り' : 'Counterclockwise',
          };
        default:
          return null;
      }
    }
    if (selectedDirection === 'INBOUND') {
      switch (headerLangState) {
        case 'EN':
          return {
            boundFor: 'Meijo Line Clockwise',
          };
        case 'ZH':
          return {
            boundFor: '名城线 右环',
          };
        case 'KO':
          return {
            boundFor: '메이조선 우회전',
          };
        default:
          return {
            boundFor: '名城線 右回り',
          };
      }
    }
    if (selectedDirection === 'OUTBOUND') {
      switch (headerLangState) {
        case 'EN':
          return {
            boundFor: 'Meijo Line Counterclockwise',
          };
        case 'ZH':
          return { boundFor: '名城线 左环' };
        case 'KO':
          return {
            boundFor: '메이조선 좌회전',
          };
        default:
          return {
            boundFor: '名城線 左回り',
          };
      }
    }

    return null;
  }, [headerLangState, reflectHeaderLanguage, selectedDirection]);

  if (currentLine && isMeijoLine(currentLine.id)) {
    return meijoLineBound;
  }

  switch (selectedDirection) {
    case 'INBOUND':
      return inboundStationForLoopLine(
        stations,
        currentIndex,
        currentLine,
        reflectHeaderLanguage ? headerLangState : fixedHeaderLangState
      );
    case 'OUTBOUND':
      return outboundStationForLoopLine(
        stations,
        currentIndex,
        currentLine,
        reflectHeaderLanguage ? headerLangState : fixedHeaderLangState
      );
    default:
      return null;
  }
};

export default useLoopLineBound;
