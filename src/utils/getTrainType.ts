import range from 'lodash/range';
import { LineDirection } from '../models/Bound';
import { Line, Station } from '../models/StationAPI';
import { TrainType } from '../models/TrainType';

const SOBU_LINE_RAPID_START_ID = 1131401;
const SOBU_LINE_RAPID_END_ID = 1131410;
const JOBAN_LINE_RAPID_START_ID = 1132001;
const JOBAN_LINE_RAPID_END_ID = 1132005;

const getTrainType = (
  line: Line | null | undefined,
  station: Station | undefined,
  direction: LineDirection | null | undefined
): TrainType => {
  if (!line) {
    return 'local';
  }
  // 成田スカイアクセス
  if (line.id === 23006) {
    return 'ltdexp';
  }
  // 総武線快速
  if (line.id === 11314) {
    const rapidIds = range(
      SOBU_LINE_RAPID_START_ID,
      SOBU_LINE_RAPID_END_ID + 1
    );
    // 千葉駅
    if (
      rapidIds[rapidIds.length - 1] === station?.id &&
      direction === 'INBOUND'
    ) {
      return 'local';
    }
    // 錦糸町駅
    if (rapidIds[0] === station?.id && direction === 'OUTBOUND') {
      return 'local';
    }
    if (rapidIds.find((id) => station?.id === id)) {
      return 'rapid';
    }
  }
  // 常磐線快速
  if (line.id === 11320) {
    const rapidIds = range(
      JOBAN_LINE_RAPID_START_ID,
      JOBAN_LINE_RAPID_END_ID + 1
    );
    // 北千住駅
    if (
      rapidIds[rapidIds.length - 1] === station?.id &&
      direction === 'INBOUND'
    ) {
      return 'local';
    }
    // 上野駅
    if (rapidIds[0] === station?.id && direction === 'OUTBOUND') {
      return 'local';
    }
    if (rapidIds.find((id) => station?.id === id)) {
      return 'rapid';
    }
  }
  return 'local';
};

export default getTrainType;
