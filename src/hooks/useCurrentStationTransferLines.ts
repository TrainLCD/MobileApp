import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getIsPass from '../utils/isPass';
import {
  getCurrentStationLinesWithoutCurrentLine,
  getNextStationLinesWithoutCurrentLine,
} from '../utils/line';
import getSlicedStations from '../utils/slicedStations';
import useCurrentLine from './useCurrentLine';

const useCurrentStationTransferLines = (): Line[] => {
  const { arrived } = useRecoilValue(stationState);
  const { station, stations, selectedDirection } = useRecoilValue(stationState);
  const { trainType, leftStations } = useRecoilValue(navigationState);

  const isInbound = selectedDirection === 'INBOUND';

  const typedTrainType = trainType as APITrainType;

  const currentLine = useCurrentLine();
  const belongingLines = leftStations.map((ls) => ls.currentLine);

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
        if (s.groupId === station?.groupId) {
          return false;
        }
        return !getIsPass(s);
      }),
    [station?.groupId, slicedStations]
  );

  const transferLinesOrigin = useMemo(() => {
    if (arrived) {
      if (getIsPass(station)) {
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
  }, [arrived, currentLine, nextStopStationIndex, slicedStations, station]);

  const transferLines = useMemo(
    () =>
      transferLinesOrigin.filter(
        (l) => belongingLines.findIndex((il) => l.id === il?.id) === -1
      ),
    [belongingLines, transferLinesOrigin]
  );

  return transferLines;
};

export default useCurrentStationTransferLines;
