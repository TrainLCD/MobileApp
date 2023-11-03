import { useEffect, useState } from 'react'
import { Line, TrainType } from '../gen/stationapi_pb'
import { isJapanese } from '../translation'
import { useRecoilValue } from 'recoil'
import lineState from '../store/atoms/line'
import { parenthesisRegexp } from '../constants'

const useTrainTypeLabels = (trainTypes: TrainType.AsObject[]) => {
  const { selectedLine } = useRecoilValue(lineState)

  const [trainTypeLabels, setTrainTypeLabels] = useState<string[]>([])

  useEffect(() => {
    const labels = trainTypes.map((tt) => {
      const solo = tt.linesList.length === 1
      if (solo || tt.id === 0) {
        return isJapanese
          ? tt.name.split('\n').join(' ')
          : tt.nameRoman?.split('\n').join(' ')
      }

      const allTrainTypeIds = tt.linesList.map((l) => l.trainType?.typeId)
      const allCompanyIds = tt.linesList.map((l) => l.company?.id)
      const isAllSameTrainType = allTrainTypeIds.every((v, i, a) => v === a[0])
      const isAllSameOperator = allCompanyIds.every((v, i, a) => v === a[0])

      const duplicatedCompanyIds = tt.linesList
        .map((l) => l.company?.id)
        .filter((id, idx, self) => self.indexOf(id) !== idx)
      const duplicatedTypeIds = tt.linesList
        .map((l) => l.trainType?.typeId)
        .filter((id, idx, self) => self.indexOf(id) !== idx)

      const reducedBySameOperatorLines = tt.linesList.reduce<Line.AsObject[]>(
        (lines, line) => {
          const isCurrentOperatedSameCompany = duplicatedCompanyIds.every(
            (id) => id === line.company?.id
          )
          const hasSameTypeLine = duplicatedTypeIds.every(
            (id) => id === line.trainType?.typeId
          )

          const hasSameCompanySameTypeLine =
            isCurrentOperatedSameCompany && hasSameTypeLine

          const hasPushedMatchedStation = lines.some(
            (l) =>
              duplicatedCompanyIds.includes(l.company?.id) &&
              duplicatedTypeIds.includes(l.trainType?.typeId)
          )

          if (hasPushedMatchedStation) {
            return lines
          }

          if (hasSameCompanySameTypeLine) {
            line.company &&
              lines.push({
                ...line,
                nameShort: `${line.company?.nameShort}線`,
                nameRoman: `${line.company?.nameEnglishShort} Line`,
              })
            return lines
          }

          lines.push(line)
          return lines
        },
        []
      )

      if (isAllSameTrainType && !isAllSameOperator) {
        if (isJapanese) {
          const otherLinesText = reducedBySameOperatorLines
            .filter((line, idx, self) =>
              self.length === 1 ? true : line.id !== selectedLine?.id
            )
            .map((l) => l.nameShort.replace(parenthesisRegexp, ''))
            .filter((txt, idx, self) => self.indexOf(txt) === idx)
            .join('・')

          if (!otherLinesText.length) {
            return `${selectedLine?.nameShort.replace(parenthesisRegexp, '')} ${
              tt.name
            }`
          }

          return `${selectedLine?.nameShort.replace(parenthesisRegexp, '')} ${
            tt.name
          }\n${otherLinesText}直通`
        } else {
          const otherLinesText = reducedBySameOperatorLines
            .filter((line, idx, self) =>
              self.length === 1 ? true : line.id !== selectedLine?.id
            )
            .map((l) => l.nameRoman?.replace(parenthesisRegexp, ''))
            .join('/')

          if (!otherLinesText.length) {
            return `${selectedLine?.nameRoman?.replace(
              parenthesisRegexp,
              ''
            )} ${tt.name}`
          }

          return `${selectedLine?.nameRoman?.replace(parenthesisRegexp, '')} ${
            tt.nameRoman
          }\n${otherLinesText}`
        }
      }

      if (isAllSameTrainType && isAllSameOperator) {
        if (isJapanese) {
          const otherLinesText = tt.linesList
            .filter((l) => l.id !== selectedLine?.id)
            .map((l) => l.nameShort.replace(parenthesisRegexp, ''))
            .filter((txt, idx, self) => self.indexOf(txt) === idx)
            .join('・')

          if (!otherLinesText.length) {
            return `${selectedLine?.nameShort.replace(parenthesisRegexp, '')} ${
              tt.name
            }`
          }

          return `${selectedLine?.nameShort.replace(parenthesisRegexp, '')} ${
            tt.name
          }\n${otherLinesText}直通`
        } else {
          const otherLinesText = tt.linesList
            .filter((l) => l.id !== selectedLine?.id)
            .map((l) => l.nameRoman?.replace(parenthesisRegexp, ''))
            .filter((txt, idx, self) => self.indexOf(txt) === idx)
            .join('/')
          if (!otherLinesText.length) {
            return `${selectedLine?.nameRoman?.replace(
              parenthesisRegexp,
              ''
            )} ${tt.name}`
          }
          return `${selectedLine?.nameRoman?.replace(parenthesisRegexp, '')} ${
            tt.nameRoman
          }\n${otherLinesText}`
        }
      }

      if (isJapanese) {
        const otherLinesText = reducedBySameOperatorLines
          .filter((l) => l.id !== selectedLine?.id)
          .map(
            (l) =>
              `${l.nameShort.replace(
                parenthesisRegexp,
                ''
              )} ${l.trainType?.name.replace(parenthesisRegexp, '')}`
          )
          .join('・')
        return `${selectedLine?.nameShort.replace(parenthesisRegexp, '')} ${
          tt.name
        }\n${otherLinesText}`
      } else {
        const otherLinesText = reducedBySameOperatorLines
          .filter((l) => l.id !== selectedLine?.id)
          .map(
            (l) =>
              `${l.nameRoman?.replace(
                parenthesisRegexp,
                ''
              )} ${l.trainType?.nameRoman?.replace(parenthesisRegexp, '')}`
          )
          .join('/')
        return `${selectedLine?.nameRoman?.replace(parenthesisRegexp, '')} ${
          tt.nameRoman
        }\n${otherLinesText}`
      }
    })

    setTrainTypeLabels(labels.filter((l) => !!l) as string[])
  }, [
    selectedLine?.id,
    selectedLine?.nameRoman,
    selectedLine?.nameShort,
    trainTypes,
  ])

  return trainTypeLabels
}

export default useTrainTypeLabels
