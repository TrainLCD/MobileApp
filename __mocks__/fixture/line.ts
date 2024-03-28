import { Line } from '../../gen/proto/stationapi_pb'

export type TrainingLineFixture = Pick<
  Line,
  'id' | 'nameShort' | 'nameKatakana' | 'nameRoman' | 'trainType'
>

export const TRAINING_WEST_LINE_FIXTURE: TrainingLineFixture = {
  id: 1,
  nameShort: '訓練西線',
  nameKatakana: 'クンレンニシセン',
  nameRoman: 'Training West Line',
  trainType: undefined,
}

export const TRAINING_CENTRAL_LINE_FIXTURE: TrainingLineFixture = {
  id: 2,
  nameShort: '訓練中央線',
  nameKatakana: 'クンレンチュウオウセン',
  nameRoman: 'Training Central Line',
  trainType: undefined,
}

export const TRAINING_EAST_LINE_FIXTURE: TrainingLineFixture = {
  id: 3,
  nameShort: '訓練東線',
  nameKatakana: 'クンレンヒガシセン',
  nameRoman: 'Training East Line',
  trainType: undefined,
}

export const TRAINING_NORTHWEST_LINE_FIXTURE: TrainingLineFixture = {
  id: 4,
  nameShort: '訓練北西線',
  nameKatakana: 'クンレンホクセイセン',
  nameRoman: 'Training Northwest Line',
  trainType: undefined,
}

export const TRAINING_NORTHEAST_LINE_FIXTURE: TrainingLineFixture = {
  id: 5,
  nameShort: '訓練東北線',
  nameKatakana: 'クンレントウホクセン',
  nameRoman: 'Training Northeast Line',
  trainType: undefined,
}

export const TRAINING_SUBURB_LINE_FIXTURE: TrainingLineFixture = {
  id: 6,
  nameShort: '訓練郊外線',
  nameKatakana: 'クンレンコウガイセン',
  nameRoman: 'Training Suburb Line',
  trainType: undefined,
}
