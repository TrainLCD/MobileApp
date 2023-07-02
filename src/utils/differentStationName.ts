import { Line, Station } from '../gen/stationapi_pb'

const isDifferentStationName = (
  station: Station.AsObject,
  line: Line.AsObject
): boolean => {
  if (
    // line.id === 0: 新幹線モック
    line.id === 0 ||
    // line.id === 1: JR線モック
    line.id === 1
  ) {
    return false
  }
  if (!line.station) {
    return false
  }

  // nameだと市ヶ谷と市ケ谷の違い程度でも違うものとなってしまうのでよみがなで判別する
  return station.nameKatakana !== line.station.nameKatakana
}

export default isDifferentStationName
