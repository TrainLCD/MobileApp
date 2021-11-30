import { useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { APITrainType, Line, Station } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import useCurrentLine from './useCurrentLine';

const useBelongingLines = (leftStations: Station[]): Line[] => {
  const { trainType } = useRecoilValue(navigationState);
  const { selectedDirection } = useRecoilValue(stationState);

  const currentLine = useCurrentLine();

  const belongingLines = useMemo(() => {
    const joinedLineIds = (trainType as APITrainType)?.lines.map((l) => l.id);

    const currentLineLines = leftStations.map((s) =>
      s.lines.find((l) => l.id === currentLine.id)
    );

    const currentLineIndex = joinedLineIds?.findIndex(
      (lid) => currentLine.id === lid
    );

    const slicedIds =
      selectedDirection === 'INBOUND'
        ? joinedLineIds?.slice(currentLineIndex + 1, joinedLineIds?.length)
        : joinedLineIds
            ?.slice()
            ?.reverse()
            ?.slice(
              joinedLineIds?.length - currentLineIndex,
              joinedLineIds?.length
            );

    const foundLines = leftStations.map((s) =>
      s.lines.find((l) => slicedIds?.find((ild) => l.id === ild))
    );

    return currentLineLines.map((l, i) =>
      !l ? foundLines[i] : leftStations[i]?.lines.find((il) => l.id === il.id)
    );
  }, [currentLine.id, leftStations, selectedDirection, trainType]);

  return belongingLines;
};

export default useBelongingLines;
