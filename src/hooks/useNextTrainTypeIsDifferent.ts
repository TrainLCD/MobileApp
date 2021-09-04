import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentLine from '../utils/currentLine';

const useNextTrainTypeIsDifferent = (): boolean => {
  const { leftStations, trainType } = useRecoilValue(navigationState);
  const { selectedDirection } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);

  const typedTrainType = trainType as APITrainType;

  const nextTrainTypeIsDifferent = useMemo(() => {
    const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);
    const currentLine = getCurrentLine(
      leftStations,
      joinedLineIds,
      selectedLine
    );

    const currentTrainTypeIndex = typedTrainType?.allTrainTypes.findIndex(
      (tt) => tt.line.id === currentLine?.id
    );
    const currentTrainType =
      typedTrainType?.allTrainTypes[currentTrainTypeIndex];
    if (selectedDirection === 'INBOUND') {
      const nextTrainType =
        typedTrainType?.allTrainTypes[currentTrainTypeIndex + 1];
      if (!nextTrainType) {
        return false;
      }
      if (
        currentTrainType?.typeId === 101 ||
        (currentTrainType?.typeId === 301 && nextTrainType?.typeId === 101) ||
        nextTrainType?.typeId === 301
      ) {
        return false;
      }

      return currentTrainType?.typeId !== nextTrainType?.typeId;
    }
    const nextTrainType =
      typedTrainType?.allTrainTypes[currentTrainTypeIndex - 1];

    if (
      currentTrainType?.typeId === 101 ||
      (currentTrainType?.typeId === 301 && nextTrainType?.typeId === 101) ||
      nextTrainType?.typeId === 301
    ) {
      return false;
    }

    return currentTrainType?.typeId !== nextTrainType?.typeId;
  }, [
    leftStations,
    selectedDirection,
    selectedLine,
    trainType,
    typedTrainType?.allTrainTypes,
  ]);

  return nextTrainTypeIsDifferent;
};

export default useNextTrainTypeIsDifferent;
