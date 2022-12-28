import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { HeaderLangState } from '../models/HeaderTransitionState';
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

const useLoopLineBoundText = (reflectHeaderLanguage = true): string => {
  const { headerState } = useRecoilValue(navigationState);
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const currentLine = useCurrentLine();

  const currentIndex = getCurrentStationIndex(stations, station);
  const headerLangState = headerState.split('_')[1] as HeaderLangState;
  const fixedHeaderLangState: HeaderLangState = isJapanese ? '' : 'EN';

  const meijoLineBoundText = useMemo(() => {
    if (!reflectHeaderLanguage) {
      switch (selectedDirection) {
        case 'INBOUND':
          return isJapanese ? '右回り' : 'Clockwise';
        case 'OUTBOUND':
          return isJapanese ? '左回り' : 'Counterclockwise';
        default:
          return '';
      }
    }
    if (selectedDirection === 'INBOUND') {
      switch (headerLangState) {
        case 'EN':
          return 'Meijo Line Clockwise';
        case 'ZH':
          return '名城线 右环';
        case 'KO':
          return '메이조선 우회전';
        default:
          return '名城線 右回り';
      }
    }
    if (selectedDirection === 'OUTBOUND') {
      switch (headerLangState) {
        case 'EN':
          return 'Meijo Line Counterclockwise';
        case 'ZH':
          return '名城线 左环';
        case 'KO':
          return '메이조선 좌회전';
        default:
          return '名城線 左回り';
      }
    }

    return '';
  }, [headerLangState, reflectHeaderLanguage, selectedDirection]);

  if (currentLine && isMeijoLine(currentLine.id)) {
    return meijoLineBoundText;
  }

  switch (selectedDirection) {
    case 'INBOUND':
      return (
        inboundStationForLoopLine(
          stations,
          currentIndex,
          currentLine,
          reflectHeaderLanguage ? headerLangState : fixedHeaderLangState
        )?.boundFor ?? ''
      );
    case 'OUTBOUND':
      return (
        outboundStationForLoopLine(
          stations,
          currentIndex,
          currentLine,
          reflectHeaderLanguage ? headerLangState : fixedHeaderLangState
        )?.boundFor ?? ''
      );
    default:
      return '';
  }
};

export default useLoopLineBoundText;
