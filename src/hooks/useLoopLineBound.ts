import { useCallback, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { HeaderLangState } from '../models/HeaderTransitionState';
import { Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import { isJapanese } from '../translation';
import getCurrentStationIndex from '../utils/currentStationIndex';
import {
  getIsLoopLine,
  inboundStationsForLoopLine,
  isMeijoLine,
  outboundStationsForLoopLine,
} from '../utils/loopLine';
import useCurrentLine from './useCurrentLine';

const useLoopLineBound = (
  reflectHeaderLanguage = true
): { boundFor: string; stations: Station[] } | null => {
  const { headerState, trainType } = useRecoilValue(navigationState);
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
            stations: [],
          };
        case 'OUTBOUND':
          return {
            boundFor: isJapanese ? '左回り' : 'Counterclockwise',
            stations: [],
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
            stations: [],
          };
        case 'ZH':
          return {
            boundFor: '名城线 右环',
            stations: [],
          };
        case 'KO':
          return {
            boundFor: '메이조선 우회전',
            stations: [],
          };
        default:
          return {
            boundFor: '名城線 右回り',
            stations: [],
          };
      }
    }
    if (selectedDirection === 'OUTBOUND') {
      switch (headerLangState) {
        case 'EN':
          return {
            boundFor: 'Meijo Line Counterclockwise',
            stations: [],
          };
        case 'ZH':
          return {
            boundFor: '名城线 左环',
            stations: [],
          };
        case 'KO':
          return {
            boundFor: '메이조선 좌회전',
            stations: [],
          };
        default:
          return {
            boundFor: '名城線 左回り',
            stations: [],
          };
      }
    }

    return null;
  }, [headerLangState, reflectHeaderLanguage, selectedDirection]);

  const getBoundFor = useCallback(
    (boundStations: Station[]) => {
      if (reflectHeaderLanguage) {
        switch (headerLangState) {
          case 'EN':
            return `${boundStations.map((s) => s.nameR).join(' and ')}`;
          case 'ZH':
            return `${boundStations.map((s) => s.nameZh).join('・')}`;
          case 'KO':
            return `${boundStations.map((s) => s.nameKo).join('・')}`;
          default:
            return `${boundStations.map((s) => s.name).join('・')}`;
        }
      }

      if (fixedHeaderLangState === 'EN') {
        return `${boundStations.map((s) => s.nameR).join(' and ')}`;
      }
      return `${boundStations.map((s) => s.name).join('・')}方面`;
    },
    [fixedHeaderLangState, headerLangState, reflectHeaderLanguage]
  );

  const bounds = useMemo(() => {
    if (currentLine && isMeijoLine(currentLine.id)) {
      return meijoLineBound;
    }

    switch (selectedDirection) {
      case 'INBOUND': {
        const inboundStations = inboundStationsForLoopLine(
          stations,
          stations[currentIndex],
          currentLine
        );
        return {
          stations: inboundStations,
          boundFor: getBoundFor(inboundStations),
        };
      }
      case 'OUTBOUND': {
        const outboundStations = outboundStationsForLoopLine(
          stations,
          stations[currentIndex],
          currentLine
        );
        return {
          stations: outboundStations,
          boundFor: getBoundFor(outboundStations),
        };
      }
      default:
        return null;
    }
  }, [
    currentIndex,
    currentLine,
    getBoundFor,
    meijoLineBound,
    selectedDirection,
    stations,
  ]);

  if (!getIsLoopLine(currentLine, trainType)) {
    return {
      stations: [],
      boundFor: '',
    };
  }

  return bounds;
};

export default useLoopLineBound;
