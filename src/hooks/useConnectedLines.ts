import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line } from '../../gen/proto/stationapi_pb'
import { parenthesisRegexp } from '../constants'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'

const useConnectedLines = (excludePassed = true): Line[] => {
  const { selectedBound, selectedDirection, stations } =
    useRecoilValue(stationState)
  const currentLine = useRecoilValue(currentLineSelector)

  const belongLines = useMemo(
    () =>
      stations
        .map((s) => s.line)
        .filter((l) => !!l)
        .filter((line, idx, arr) => arr[idx - 1]?.id !== line?.id)
        .map((l) => new Line(l)) ?? [],
    [stations]
  )

  const excludeSameNameLines = useCallback(
    (lines: Line[]): Line[] =>
      lines.filter(
        // 乗車中の路線と同じ名前の路線をしばき倒す
        (l) =>
          l.nameShort.replace(parenthesisRegexp, '') !==
          currentLine?.nameShort.replace(parenthesisRegexp, '')
      ),
    [currentLine?.nameShort]
  )

  const joinedLineIds = useMemo(
    () => belongLines.map((l) => l.id),
    [belongLines]
  )

  if (!selectedBound) {
    return []
  }

  if (excludePassed) {
    const currentLineIndex = joinedLineIds.findIndex(
      (lid) => lid === currentLine?.id
    )

    const notGroupedJoinedLines: Line[] =
      selectedDirection === 'INBOUND'
        ? joinedLineIds
            .slice(currentLineIndex + 1, joinedLineIds.length)
            .map((_, i) => belongLines.slice().reverse()[i])
            .map((l) => ({
              ...l,
              name: l.nameShort.replace(parenthesisRegexp, ''),
            }))
            .map((l) => new Line(l))
            .reverse()
        : joinedLineIds
            .slice(0, currentLineIndex)
            .map((_, i) => belongLines[i])
            .map((l) => ({
              ...l,
              name: l.nameShort.replace(parenthesisRegexp, ''),
            }))
            .map((l) => new Line(l))
            .reverse()
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
          }
        }
        return l
      })
    const companyNotDuplicatedLines = notGroupedJoinedLines.filter((l) => {
      return (
        companyDuplicatedLines.findIndex(
          (jl) => jl.company?.id === l.company?.id
        ) === -1
      )
    })

    const joinedLines = [
      ...companyDuplicatedLines,
      ...companyNotDuplicatedLines,
    ]
      // 直通する順番通りにソートする
      .reduce<Line[]>((acc, cur, idx, arr) => {
        // 直通先が1つしかなければ別に計算する必要はない
        if (arr.length === 1) {
          return [new Line(cur)]
        }

        // 処理中の路線がグループ化されていない配列の何番目にあるか調べる
        // このindexが実際の直通順に入るようにしたい
        const currentIndex = notGroupedJoinedLines.findIndex(
          (l) => l.id === cur.id
        )

        // 処理中のindexがcurrentIndexより大きいまたは等しい場合、
        // 処理が終わった配列を展開しグループ化されていない
        // 現在路線~最終直通先の配列を返し、次のループへ
        if (currentIndex <= idx) {
          return [...acc, ...notGroupedJoinedLines.slice(currentIndex)]
        }

        // 処理中のindexがcurrentIndexより小さい場合、
        // 処理が終わった配列を展開しグループ化されていない
        // 配列の最初から現在のindexまでを返し、次のループへ
        return [...acc, ...notGroupedJoinedLines.slice(0, currentIndex)]
      }, [])
      // ループ設計上路線が重複する可能性があるのでここで重複をしばく
      .filter((l, i, arr) => arr.findIndex((il) => il.id === l.id) === i)

    return excludeSameNameLines(
      joinedLines.filter(
        (l, i, arr) =>
          arr.findIndex(
            (jl) =>
              l.nameShort.replace(parenthesisRegexp, '') ===
              jl.nameShort.replace(parenthesisRegexp, '')
          ) === i
      )
    )
  }

  return excludeSameNameLines(belongLines)
}

export default useConnectedLines
