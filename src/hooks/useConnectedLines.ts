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

  const excludeSameNameLines = (lines: Line[]): Line[] =>
    lines.filter(
      // 乗車中の路線と同じ名前の路線をしばき倒す
      (l) => currentLine?.id !== l.id
    );

  const joinedLineIds = typedTrainType.lines.map((l) => l.id);

  if (excludePassed) {
    const currentLineIndex = joinedLineIds.findIndex(
      (lid) => lid === currentLine?.id
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
      ...companyDuplicatedLines,
      ...companyNotDuplicatedLines,
    ]
      // 直通する順番通りにソートする
      .reduce<Line[]>((acc, cur, idx, arr) => {
        // 直通先が1つしかなければ別に計算する必要はない
        if (arr.length === 1) {
          return [cur];
        }

        // 処理中の路線がグループ化されていない配列の何番目にあるか調べる
        // このindexが実際の直通順に入るようにしたい
        const currentIndex = notGroupedJoinedLines.findIndex(
          (l) => l.id === cur.id
        );

        // 処理中のindexがcurrentIndexより大きいまたは等しい場合、
        // 処理が終わった配列を展開しグループ化されていない
        // 現在路線~最終直通先の配列を返し、次のループへ
        if (currentIndex <= idx) {
          return [...acc, ...notGroupedJoinedLines.slice(currentIndex)];
        }

        // 処理中のindexがcurrentIndexより小さい場合、
        // 処理が終わった配列を展開しグループ化されていない
        // 配列の最初から現在のindexまでを返し、次のループへ
        return [...acc, ...notGroupedJoinedLines.slice(0, currentIndex)];
      }, [])
      // ループ設計上路線が重複する可能性があるのでここで重複をしばく
      .filter((l, i, arr) => arr.findIndex((il) => il.id === l.id) === i);

    return excludeSameNameLines(
      joinedLines.filter(
        (l, i, arr) => arr.findIndex((jl) => l.name === jl.name) === i
      )
    );
  }

  return excludeSameNameLines(typedTrainType?.lines || []);
};

export default useConnectedLines;
