import { Line, TrainType, TrainTypeKind } from '../../gen/proto/stationapi_pb'
import {
  TRAINING_CENTRAL_LINE_FIXTURE,
  TRAINING_SUBURB_LINE_FIXTURE,
} from './line'

export type TrainingTrainTypeFixture = Pick<
  TrainType,
  | 'id'
  | 'groupId'
  | 'name'
  | 'nameKatakana'
  | 'nameRoman'
  | 'kind'
  | 'line'
  | 'lines'
>

export const TRAINING_LOCAL_FIXTURE: TrainingTrainTypeFixture = {
  id: 1,
  groupId: 1,
  name: '普通',
  nameKatakana: 'フツウ',
  nameRoman: 'Local',
  kind: TrainTypeKind.Default,
  lines: [] as Line[],
}
const TRAINING_EXPRESS_FIXTURE_BASE: TrainingTrainTypeFixture = {
  id: 2,
  groupId: 2,
  name: '急行',
  nameKatakana: 'キュウコウ',
  nameRoman: 'Express',
  kind: TrainTypeKind.Express,
  lines: [],
}

export const TRAINING_EXPRESS_FIXTURE: TrainingTrainTypeFixture = {
  ...TRAINING_EXPRESS_FIXTURE_BASE,
  lines: [
    {
      ...TRAINING_CENTRAL_LINE_FIXTURE,
      trainType: TRAINING_EXPRESS_FIXTURE_BASE,
    },
    {
      ...TRAINING_SUBURB_LINE_FIXTURE,
      trainType: TRAINING_EXPRESS_FIXTURE_BASE,
    },
  ] as Line[],
}
