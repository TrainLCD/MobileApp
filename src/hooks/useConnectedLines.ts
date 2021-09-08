import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { APITrainType, Line } from '../models/StationAPI';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import useCurrentLine from './useCurrentLine';

const useConnectedLines = (excludePassed = true): Line[] => {
  const { trainType } = useRecoilValue(navigationState);
  const { selectedBound, selectedDirection } = useRecoilValue(stationState);

  const currentLine = useCurrentLine();

  if (!selectedBound) {
    return [];
  }

  const typedTrainType = trainType as APITrainType | null;

  if (!typedTrainType) {
    return [];
  }

  const joinedLineIds = typedTrainType.lines.map((l) => l.id);

  if (excludePassed) {
    const currentLineIndex = joinedLineIds.findIndex(
      (lid) => lid === currentLine.id
    );

    const notGroupedJoinedLines =
      selectedDirection === 'INBOUND'
        ? joinedLineIds
            .slice(currentLineIndex + 1, joinedLineIds.length)
            .map((lid, i) => typedTrainType.lines.slice().reverse()[i])
            .map((l) => ({
              ...l,
              name: l.name.replace(parenthesisRegexp, ''),
            }))
            .reverse()
        : joinedLineIds
            .slice(0, currentLineIndex)
            .map((lid, i) => typedTrainType.lines[i])
            .map((l) => ({
              ...l,
              name: l.name.replace(parenthesisRegexp, ''),
            }))
            .reverse();
    const companyDuplicatedLines = notGroupedJoinedLines
      .filter((l, i, arr) => l.companyId === arr[i - 1]?.companyId)
      .map((l) => {
        if (
          notGroupedJoinedLines.findIndex((jl) => jl.companyId === l.companyId)
        ) {
          return {
            ...l,
            name: `${l.company.nameR}線`,
            nameR: `${l.company.nameEn} Line`,
          };
        }
        return l;
      });
    const companyNotDuplicatedLines = notGroupedJoinedLines.filter((l) => {
      return (
        companyDuplicatedLines.findIndex(
          (jl) => jl.companyId === l.companyId
        ) === -1
      );
    });

    const joinedLines = [
      ...companyNotDuplicatedLines,
      ...companyDuplicatedLines,
    ];

    return joinedLines.filter(
      (l, i, arr) => arr.findIndex((jl) => l.name === jl.name) === i
    );
  }

  return typedTrainType?.lines || [];
};

export default useConnectedLines;
