import { useRecoilValue } from 'recoil';
import { parenthesisRegexp } from '../constants/regexp';
import { APITrainType, Line } from '../models/StationAPI';
import lineState from '../store/atoms/line';
import navigationState from '../store/atoms/navigation';
import stationState from '../store/atoms/station';
import getCurrentLine from '../utils/currentLine';

const useConnectedLines = (excludePassed = true): Line[] => {
  const { trainType, leftStations } = useRecoilValue(navigationState);
  const { selectedBound } = useRecoilValue(stationState);
  const { selectedLine } = useRecoilValue(lineState);

  if (!selectedBound) {
    return [];
  }

  const typedTrainType = trainType as APITrainType | null;

  if (!typedTrainType) {
    return [];
  }

  const joinedLineIds = typedTrainType.lines.map((l) => l.id);

  if (excludePassed) {
    const currentLine = getCurrentLine(
      leftStations,
      joinedLineIds,
      selectedLine
    );
    const shouldReverse =
      joinedLineIds.findIndex(
        (lid) => lid === selectedBound?.lines.find((l) => l.id === lid)?.id
      ) !== 0;

    if (shouldReverse) {
      const currentLineIndex = joinedLineIds?.findIndex(
        (lid) => lid === currentLine.id
      );

      const notGroupedJoinedLines = joinedLineIds
        .slice(currentLineIndex, joinedLineIds.length - 1)
        .map((lid, i) => typedTrainType.lines.slice().reverse()[i])
        .reverse()
        .map((l) => ({ ...l, name: l.name.replace(parenthesisRegexp, '') }));

      const companyDuplicatedLines = notGroupedJoinedLines
        .filter((l, i, arr) => l.companyId === arr[i - 1]?.companyId)
        .map((l) => {
          if (
            notGroupedJoinedLines.findIndex(
              (jl) => jl.companyId === l.companyId
            )
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

    const notGroupedJoinedLines = joinedLineIds
      .slice(0, joinedLineIds.length)
      .map((lid, i) => typedTrainType.lines.slice().reverse()[i])
      .map((l) => ({ ...l, name: l.name.replace(parenthesisRegexp, '') }));

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

    const duplicatedLineIndex = joinedLineIds.findIndex(
      (lid) =>
        companyDuplicatedLines.findIndex((dlid) => dlid.id === lid) !== -1
    );
    const currentLineIndex = joinedLineIds.findIndex(
      (lid) => lid === currentLine.id
    );

    const companyNotDuplicatedLines = notGroupedJoinedLines.filter((l) => {
      return (
        companyDuplicatedLines.findIndex(
          (jl) => jl.companyId === l.companyId
        ) === -1
      );
    });

    if (duplicatedLineIndex > currentLineIndex) {
      return companyNotDuplicatedLines;
    }

    const joinedLines = [
      ...companyNotDuplicatedLines,
      ...companyDuplicatedLines,
    ].filter((l) => l.id !== currentLine.id);
    return joinedLines.filter(
      (l, i, arr) => arr.findIndex((jl) => l.name === jl.name) === i
    );
  }

  return typedTrainType?.lines || [];
};

export default useConnectedLines;
