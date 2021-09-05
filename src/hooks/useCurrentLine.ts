import { useEffect, useState } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';

const useCurrentLine = (): Line => {
  const { leftStations, trainType } = useRecoilValue(navigationState);
  const { selectedLine } = useRecoilValue(lineState);
  const [currentLine, setCurrentLine] = useState<Line>();

  useEffect((): void => {
    const typedTrainType = trainType as APITrainType;
    const joinedLineIds = typedTrainType?.lines.map((l) => l.id);
    setCurrentLine(
      leftStations.map((s) =>
        s.lines.find((l) => joinedLineIds?.find((il) => l.id === il))
      )[0]
    );
  }, [leftStations, trainType]);

  return currentLine || selectedLine;
};

export default useCurrentLine;
