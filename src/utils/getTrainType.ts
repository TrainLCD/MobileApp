import range from 'lodash/range';
import { LineDirection } from '../models/Bound';
import { Line, Station } from '../models/StationAPI';
import { TrainType } from '../models/TrainType';

const SOBU_LINE_RAPID_START_ID = 1131404;
const SOBU_LINE_RAPID_END_ID = 1131410;

const getTrainType = (
  line: Line | undefined,
  station: Station | undefined,
  direction: LineDirection
): TrainType => {
  if (!line) {
    return 'local';
  }
  // 成田エクスプレス
  if (line.id === 11328) {
    return 'ltdexp';
  }
  // 中央線快速
  if (line.id === 11312) {
    return 'rapid';
  }
  // 総武線快速
  if (line.id === 11314) {
    const rapidIds = range(
      SOBU_LINE_RAPID_START_ID,
      SOBU_LINE_RAPID_END_ID + 1
    );
    // 千葉駅
    if (
      rapidIds[rapidIds.length - 1] === station.id &&
      direction === 'INBOUND'
    ) {
      return 'local';
    }
    // 錦糸町駅
    if (rapidIds[0] === station.id && direction === 'OUTBOUND') {
      return 'local';
    }
    if (rapidIds.find((id) => station.id === id)) {
      return 'rapid';
    }
  }
  return 'local';
};

export default getTrainType;
