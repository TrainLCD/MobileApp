import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../utils/line';
import getSlicedStations from '../utils/slicedStations';
import useCurrentLine from './useCurrentLine';

const useTransferLines = (): Line[] => {
  const { arrived } = useRecoilValue(stationState);
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const { trainType } = useRecoilValue(navigationState);

  const isInbound = selectedDirection === 'INBOUND';

  const typedTrainType = trainType as APITrainType;

  const currentLine = useCurrentLine();

  const slicedStations = getSlicedStations({
    stations,
    currentStation: station,
    isInbound,
    arrived,
    currentLine,
    trainType: typedTrainType,
  });

  const nextStopStationIndex = useMemo(
    () =>
      slicedStations.findIndex((s) => {
        if (s.id === station?.id) {
          return false;
        }
        return !s.pass;
      }),
    [station?.id, slicedStations]
  );

  const transferLines = useMemo(() => {
    if (arrived) {
      if (station?.pass) {
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
    nextStopStationIndex,
    slicedStations,
    station?.pass,
  ]);

  return transferLines;
};

export default useTransferLines;
