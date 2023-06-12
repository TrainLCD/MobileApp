import { JR_LINE_MAX_ID, OMIT_JR_THRESHOLD } from '../constants'
import { LineResponse, OperationStatus } from '../gen/stationapi_pb'
import { LINE_TYPE } from '../models/StationAPI'

export const isJRLine = (line: LineResponse.AsObject): boolean =>
  !!(line.company && line.company?.id <= JR_LINE_MAX_ID)

const jrCompanyColor = (companyId: number | undefined): string => {
  switch (companyId) {
    case 1: // 北海道
      return '03c13d'
    case 2: // 東日本
      return '378640'
    case 3: // 東海
      return 'ff7e1c'
    case 4: // 西日本
      return '0072ba'
    case 5: // 四国
      return '00acd1'
    case 6: // 九州
      return 'f62e36'
    default:
      return ''
  }
}

const omitJRLinesIfThresholdExceeded = (
  lines: LineResponse.AsObject[]
): LineResponse.AsObject[] => {
  const withoutJR = lines.filter(
    (line: LineResponse.AsObject) => !isJRLine(line)
  )
  const jrLines = lines.filter((line: LineResponse.AsObject) => isJRLine(line))

  const jrLinesWithoutBT = jrLines.filter(
    (line: LineResponse.AsObject) => line.lineType !== LINE_TYPE.BULLET_TRAIN
  )
  const jrLinesWithBT = jrLines.filter(
    (line: LineResponse.AsObject) => line.lineType === LINE_TYPE.BULLET_TRAIN
  )
  if (jrLinesWithoutBT.length >= OMIT_JR_THRESHOLD) {
    withoutJR.unshift({
      id: 1,
      color: jrCompanyColor(jrLinesWithoutBT[0].company?.id),
      nameShort: 'JR線',
      nameRoman: 'JR Lines',
      nameKatakana: 'JRセン',
      lineType: LINE_TYPE.NORMAL,
      company: jrLinesWithoutBT[0].company,
      nameChinese: 'JR线',
      nameKorean: 'JR선',
      lineSymbolsList: [],
      nameFull: '',
      status: OperationStatus.INOPERATION,
    })
    if (jrLinesWithBT.length) {
      withoutJR.unshift({
        id: 0,
        color: jrCompanyColor(jrLinesWithBT[0].company?.id),
        nameShort: '新幹線',
        nameRoman: 'Shinkansen',
        nameKatakana: 'シンカンセン',
        lineType: LINE_TYPE.BULLET_TRAIN,
        company: jrLinesWithBT[0].company,
        nameChinese: '新干线',
        nameKorean: '신칸센',
        lineSymbolsList: [],
        nameFull: '',
        status: OperationStatus.INOPERATION,
      })
    }
    return withoutJR
  }
  return lines
}

export default omitJRLinesIfThresholdExceeded
