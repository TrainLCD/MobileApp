import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';

const useCurrentLine = (): Line => {
  const { leftStations, trainType } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);
  const { station, stations } = useRecoilValue(stationState);
  const [currentLine, setCurrentLine] = useState<Line>();

  useEffect((): void => {
    const typedTrainType = trainType as APITrainType;
    const joinedLineIds = typedTrainType?.lines.map((l) => l.id);

    const currentStationIndex = stations.findIndex((s) => station?.id === s.id);
    const prevStationType = joinedLineIds?.find(
      (lid) =>
        stations[currentStationIndex - 1]?.lines?.findIndex(
          (l) => l.id === lid
        ) !== -1
    );
    const nextStationType = joinedLineIds?.find(
      (lid) =>
        stations[currentStationIndex + 1]?.lines?.findIndex(
          (l) => l.id === lid
        ) !== -1
    );

    if (prevStationType === nextStationType) {
      setCurrentLine(
        typedTrainType?.lines?.find((l) => l.id === prevStationType)
      );
    } else {
      setCurrentLine(
        leftStations.map((s) =>
          s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
        )[0]
      );
    }
  }, [leftStations, station?.id, stations, trainType]);

  return currentLine || selectedLine;
};

export default useCurrentLine;
