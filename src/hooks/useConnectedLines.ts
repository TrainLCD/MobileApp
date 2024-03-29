import { useCallback, useMemo } from 'react'
import { useRecoilValue } from 'recoil'
import { Line } from '../../gen/proto/stationapi_pb'
import { parenthesisRegexp } from '../constants'
import navigationState from '../store/atoms/navigation'
import stationState from '../store/atoms/station'
import { currentLineSelector } from '../store/selectors/currentLine'

const useConnectedLines = (excludePassed = true): Line[] => {
  const { trainType } = useRecoilValue(navigationState)
  const { selectedBound, selectedDirection } = useRecoilValue(stationState)
  const currentLine = useRecoilValue(currentLineSelector)

  const trainTypeLines = useMemo(
    () => trainType?.lines ?? [],
    [trainType?.lines]
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
    () => trainTypeLines.map((l) => l.id),
    [trainTypeLines]
  )

  if (!trainType || !selectedBound) {
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
            .map((_, i) => trainTypeLines.slice().reverse()[i])
            .map((l) => ({
              ...l,
              name: l.nameShort.replace(parenthesisRegexp, ''),
            }))
            .map((l) => new Line(l))
            .reverse()
        : joinedLineIds
            .slice(0, currentLineIndex)
            .map((_, i) => trainTypeLines[i])
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

  return excludeSameNameLines(trainTypeLines)
}

export default useConnectedLines
