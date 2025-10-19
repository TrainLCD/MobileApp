import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import stationState from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';

export const useConnectedLines = (excludePassed = true): Line[] => {
  const { selectedBound, selectedDirection, stations } =
    useAtomValue(stationState);
  const currentLine = useCurrentLine();

  const belongLines = useMemo(
    () =>
      stations
        .map((s) => s.line)
        .filter((l): l is Line => !!l)
        .filter((line, idx, arr) => arr[idx - 1]?.id !== line?.id) ?? [],
    [stations]
  );

  const excludeSameNameLines = useCallback(
    (lines: Line[]): Line[] =>
      lines.filter(
        // 乗車中の路線と同じ名前の路線をしばき倒す
        (l) =>
          l.nameShort?.replace(parenthesisRegexp, '') !==
          currentLine?.nameShort?.replace(parenthesisRegexp, '')
      ),
    [currentLine?.nameShort]
  );

  const joinedLineIds = useMemo(
    () => belongLines.map((l) => l.id),
    [belongLines]
  );

  if (!selectedBound) {
    return [];
  }

  if (excludePassed) {
    const currentLineIndex = joinedLineIds.findIndex(
      (lid) => lid === currentLine?.id
    );

    const notGroupedJoinedLines: Line[] =
      selectedDirection === 'INBOUND'
        ? joinedLineIds
            .slice(currentLineIndex + 1, joinedLineIds.length)
            .map((_, i) => belongLines.slice().reverse()[i])
            .map((l) => ({
              ...l,
              name: l.nameShort?.replace(parenthesisRegexp, ''),
            }))
            .map((l) => l)
            .reverse()
        : joinedLineIds
            .slice(0, currentLineIndex)
            .map((_, i) => belongLines[i])
            .map((l) => ({
              ...l,
              name: l.nameShort?.replace(parenthesisRegexp, ''),
            }))
            .map((l) => l)
            .reverse();
    const companyDuplicatedLines = notGroupedJoinedLines
      .filter((l, i, arr) => l.company?.id === arr[i - 1]?.company?.id)
      .map((l) => {
        if (
          notGroupedJoinedLines.findIndex(
            (jl) => jl.company?.id === l.company?.id
          )
        ) {
          return {
            ...l,
            name: `${l.company?.nameShort}線`,
            nameR: `${l.company?.nameEnglishShort} Line`,
          };
        }
        return l;
      });
    const companyNotDuplicatedLines = notGroupedJoinedLines.filter((l) => {
      return (
        companyDuplicatedLines.findIndex(
          (jl) => jl.company?.id === l.company?.id
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
          return acc.concat(notGroupedJoinedLines.slice(currentIndex));
        }

        // 処理中のindexがcurrentIndexより小さい場合、
        // 処理が終わった配列を展開しグループ化されていない
        // 配列の最初から現在のindexまでを返し、次のループへ
        return acc.concat(notGroupedJoinedLines.slice(0, currentIndex + 1));
      }, [])
      // ループ設計上路線が重複する可能性があるのでここで重複をしばく
      .filter((l, i, arr) => arr.findIndex((il) => il.id === l.id) === i)
      // NOTE: 終点駅が直通先の次の駅に接続していない場合、実質接続していない路線は省く
      // 例: 池袋→元町・中華街の際横浜を終点と指定した際にみなとみらい線が入り込む
      .filter((l) => {
        if (
          stations.filter((s) => s.line?.id === selectedBound?.line?.id)
            .length === 1
        ) {
          return l.id !== selectedBound.line?.id;
        }
        return true;
      });

    return excludeSameNameLines(
      joinedLines.filter(
        (l, i, arr) =>
          arr.findIndex(
            (jl) =>
              l.nameShort?.replace(parenthesisRegexp, '') ===
              jl.nameShort?.replace(parenthesisRegexp, '')
          ) === i
      )
    );
  }

  return excludeSameNameLines(belongLines);
};
