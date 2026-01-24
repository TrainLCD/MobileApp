import { useAtomValue } from 'jotai';
import { useMemo } from 'react';
import type { Station } from '~/@types/graphql';
import stationState from '../store/atoms/station';
import { themeAtom } from '../store/atoms/theme';
import { generateTTSText } from '../utils/tts/generateTTSText';
import { useAfterNextStation } from './useAfterNextStation';
import { useBounds } from './useBounds';
import { useConnectedLines } from './useConnectedLines';
import { useCurrentLine } from './useCurrentLine';
import { useCurrentStation } from './useCurrentStation';
import { useCurrentTrainType } from './useCurrentTrainType';
import { useIsTerminus } from './useIsTerminus';
import { useLoopLine } from './useLoopLine';
import { useLoopLineBound } from './useLoopLineBound';
import { useNextStation } from './useNextStation';
import { useSlicedStations } from './useSlicedStations';
import { useStationNumberIndexFunc } from './useStationNumberIndexFunc';
import { useStoppingState } from './useStoppingState';
import { useTransferLines } from './useTransferLines';

export const useTTSText = (
  firstSpeech = true,
  enabled = false
): [string, string] | [] => {
  const theme = useAtomValue(themeAtom);
  const { selectedBound, stations } = useAtomValue(stationState);

  const currentStation = useCurrentStation();
  const currentLine = useCurrentLine();
  const nextStation = useNextStation();
  const afterNextStation = useAfterNextStation();
  const stoppingState = useStoppingState();
  const transferLines = useTransferLines();
  const connectedLines = useConnectedLines();
  const currentTrainType = useCurrentTrainType();
  const { isLoopLine, isPartiallyLoopLine } = useLoopLine();
  const loopLineBoundJa = useLoopLineBound(false, 'JA');
  const loopLineBoundEn = useLoopLineBound(false, 'EN');
  const { directionalStops } = useBounds(stations);
  const slicedStationsRaw = useSlicedStations();
  const isNextStopTerminus = useIsTerminus(nextStation);
  const isAfterNextStopTerminus = useIsTerminus(afterNextStation);
  const getStationNumberIndex = useStationNumberIndexFunc();

  // 直通時、同じGroupIDの駅が違う駅として扱われるのを防ぐ
  const slicedStations = useMemo(
    () =>
      Array.from(new Set(slicedStationsRaw.map((s) => s.groupId)))
        .map((gid) => slicedStationsRaw.find((s) => s.groupId === gid))
        .filter((s): s is Station => !!s),
    [slicedStationsRaw]
  );

  // 駅番号取得
  const nextStationNumber = useMemo(() => {
    if (!nextStation?.stationNumbers) {
      return undefined;
    }
    const stationNumberIndex = getStationNumberIndex(nextStation);
    if (
      !Number.isInteger(stationNumberIndex) ||
      stationNumberIndex < 0 ||
      stationNumberIndex >= nextStation.stationNumbers.length
    ) {
      return undefined;
    }
    return nextStation.stationNumbers[stationNumberIndex];
  }, [getStationNumberIndex, nextStation]);

  if (!enabled) {
    return [];
  }

  return generateTTSText({
    theme,
    firstSpeech,
    stoppingState,
    currentLine,
    currentStation,
    nextStation,
    afterNextStation,
    selectedBound,
    transferLines,
    connectedLines,
    currentTrainType,
    isLoopLine,
    isPartiallyLoopLine,
    loopLineBoundJa: loopLineBoundJa?.boundFor,
    loopLineBoundEn: loopLineBoundEn?.boundFor,
    directionalStops,
    slicedStations,
    isNextStopTerminus,
    isAfterNextStopTerminus,
    nextStationNumber: nextStationNumber
      ? {
          stationNumber: nextStationNumber.stationNumber,
          lineSymbol: nextStationNumber.lineSymbol,
        }
      : undefined,
  });
};
