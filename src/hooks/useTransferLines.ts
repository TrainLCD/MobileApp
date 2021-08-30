import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentLine from '../utils/currentLine';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../utils/line';
import getSlicedStations from '../utils/slicedStations';

const useTransferLines = (): Line[] => {
  const { arrived } = useRecoilValue(stationState);
  const { stations, selectedDirection } = useRecoilValue(stationState);
  const { leftStations, trainType } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);

  const isInbound = selectedDirection === 'INBOUND';

  const typedTrainType = trainType as APITrainType;

  const joinedLineIds = typedTrainType?.lines.map((l) => l.id);
  const currentLine = getCurrentLine(leftStations, joinedLineIds, selectedLine);

  const slicedStations = getSlicedStations({
    stations,
    currentStation: leftStations[0],
    isInbound,
    arrived,
    currentLine,
    trainType: typedTrainType,
  });

  const nextStopStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => {
        if (s.id === leftStations[0]?.id) {
          return false;
        }
        return !s.pass;
      }),
    [leftStations, slicedStations]
  );

  const transferLines = useMemo(() => {
    if (arrived) {
      const currentStation = leftStations[0];
      if (currentStation?.pass) {
        return getNextStationLinesWithoutCurrentLine(
          slicedStations,
          currentLine,
          nextStopStationIndex
        );
      }
      return getCurrentStationLinesWithoutCurrentLine(
        slicedStations,
        currentLine
      );
    }
    return getNextStationLinesWithoutCurrentLine(
      slicedStations,
      currentLine,
      nextStopStationIndex
    );
  }, [
    arrived,
    currentLine,
    leftStations,
    nextStopStationIndex,
    slicedStations,
  ]);

  return transferLines;
};

export default useTransferLines;
