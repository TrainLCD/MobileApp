import { JR_LINE_MAX_ID, OMIT_JR_THRESHOLD } from '../constants'
import { MARK_SHAPE } from '../constants/numbering'
import { Line, LineType } from '../gen/stationapi_pb'

export const isJRLine = (line: Line.AsObject): boolean =>
  line.company ? line.company.id <= JR_LINE_MAX_ID : false

const jrCompanyColor = (companyId: number): string => {
  switch (companyId) {
    case 1: // 北海道
      return '#03c13d'
    case 2: // 東日本
      return '#378640'
    case 3: // 東海
      return '#ff7e1c'
    case 4: // 西日本
      return '#0072ba'
    case 5: // 四国
      return '#00acd1'
    case 6: // 九州
      return '#f62e36'
    default:
      return ''
  }
}

const omitJRLinesIfThresholdExceeded = (
  lines: Line.AsObject[]
): Line.AsObject[] => {
  const withoutJR = lines.filter((line: Line.AsObject) => !isJRLine(line))
  const jrLines = lines.filter((line: Line.AsObject) => isJRLine(line))

  const jrLinesWithoutBT = jrLines.filter(
    (line: Line.AsObject) => line.lineType !== LineType.BULLETTRAIN
  )
  const jrLinesWithBT = jrLines.filter(
    (line: Line.AsObject) => line.lineType === LineType.BULLETTRAIN
  )
  if (jrLinesWithoutBT.length >= OMIT_JR_THRESHOLD) {
    withoutJR.unshift({
      id: 1,
      color: jrLinesWithoutBT[0].company
        ? jrCompanyColor(jrLinesWithoutBT[0].company?.id)
        : '#000000',
      nameShort: 'JR線',
      nameRoman: 'JR Lines',
      nameKatakana: 'JRセン',
      lineType: LineType.NORMAL,
      nameChinese: 'JR线',
      nameKorean: 'JR선',
      nameFull: 'JR線',
      status: 0,
      company: {
        id: 0,
        railroadId: 0,
        type: 0,
        status: 0,
        nameShort: 'JR',
        nameFull: 'JR',
        nameKatakana: 'ジェイアール',
        nameEnglishShort: 'JR',
        nameEnglishFull: 'JR',
      },
      lineSymbolsList: [
        {
          symbol: '',
          shape: MARK_SHAPE.JR_UNION,
          color: jrLinesWithoutBT[0].company
            ? jrCompanyColor(jrLinesWithoutBT[0].company?.id)
            : '#000000',
        },
      ],
    })
    if (jrLinesWithBT.length) {
      withoutJR.unshift({
        id: jrLinesWithBT[0].id,
        color: jrLinesWithBT[0].company
          ? jrCompanyColor(jrLinesWithBT[0].company?.id)
          : '#000000',
        nameShort: '新幹線',
        nameRoman: 'Shinkansen',
        nameKatakana: 'シンカンセン',
        lineType: LineType.NORMAL,
        nameChinese: '新干线',
        nameKorean: '신칸센',
        nameFull: '新幹線',
        status: 0,
        company: {
          id: 0,
          railroadId: 0,
          type: 0,
          status: 0,
          nameShort: 'JR',
          nameFull: 'JR',
          nameKatakana: 'ジェイアール',
          nameEnglishShort: 'JR',
          nameEnglishFull: 'JR',
        },
        lineSymbolsList: [
          {
            symbol: '',
            shape: MARK_SHAPE.BULLET_TRAIN_UNION,
            color: jrLinesWithoutBT[0].company
              ? jrCompanyColor(jrLinesWithoutBT[0].company?.id)
              : '#000000',
          },
        ],
      })
    }
    return withoutJR
  }
  return lines
}

export default omitJRLinesIfThresholdExceeded
