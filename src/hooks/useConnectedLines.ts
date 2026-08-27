import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import type { Line } from '~/@types/graphql';
import { parenthesisRegexp } from '~/constants';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
  stationsAtom,
} from '../store/atoms/station';
import { useCurrentLine } from './useCurrentLine';

export const useConnectedLines = (excludePassed = true): Line[] => {
  const selectedBound = useAtomValue(selectedBoundAtom);
  const selectedDirection = useAtomValue(selectedDirectionAtom);
  const stations = useAtomValue(stationsAtom);
  const currentLine = useCurrentLine();

  const belongLines = useMemo(
    () =>
      stations
        .map((s) => s.line)
        .filter((l) => !!l)
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

    // 以前は belongLines.slice().reverse()[i] を要素ごとに呼んでおり O(n²)。
    // reverse は1度だけキャッシュする。
    const reversedBelongLines =
      selectedDirection === 'INBOUND' ? belongLines.slice().reverse() : null;

    const joinedLinesInOrder: Line[] =
      selectedDirection === 'INBOUND'
        ? joinedLineIds
            .slice(currentLineIndex + 1, joinedLineIds.length)
            .map((_, i) => (reversedBelongLines as Line[])[i])
            .map((l) => ({
              ...l,
              name: l.nameShort?.replace(parenthesisRegexp, ''),
            }))
            .reverse()
        : joinedLineIds
            .slice(0, currentLineIndex)
            .map((_, i) => belongLines[i])
            .map((l) => ({
              ...l,
              name: l.nameShort?.replace(parenthesisRegexp, ''),
            }))
            .reverse();
    // NOTE: 以前はここで「同じ会社の路線が連続する場合は会社名でまとめる」処理を挟み、
    // まとめた配列を直通順へ並べ直していた。しかし並べ直しの reduce が
    // joinedLinesInOrder から要素を取り直す実装だったため、まとめた結果は
    // 実質的に破棄されており、グループ化は name / nameR にしか効いていなかった
    // （表示は nameShort、TTS は nameShort / nameRoman / nameTtsSegments を見る）。
    // その上で絞り込みが路線 ID ではなく会社 ID を基準にしていたせいで、
    //   - [相鉄新横浜線, 相鉄本線] のように同一会社が連続すると先に入る路線が落ち、
    //     直通先として「その会社の最後の路線」が案内される
    //   - [A社, A社, B社, A社] のように同一会社が飛び飛びで現れると末尾が落ちる
    // という欠落が起きていた (#6747)。
    // 直通順の配列をそのまま使えば、グループ化の絞り込みを路線 ID 基準に直した場合と
    // 同じ並びになる（長さ5・会社3種までの全並びで一致を確認済み）ため、単純化する。
    const joinedLines = joinedLinesInOrder
      // 同じ路線が飛び飛びで現れることがあるのでここで重複をしばく
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
