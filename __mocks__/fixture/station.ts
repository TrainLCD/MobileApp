import { StopCondition } from '../../gen/proto/stationapi_pb'
import { Line, Station, StationNumber } from '../../gen/proto/stationapi_pb'
import { MARK_SHAPE } from '../../src/constants'
import {
  TRAINING_CENTRAL_LINE_FIXTURE,
  TRAINING_EAST_LINE_FIXTURE,
  TRAINING_NORTHEAST_LINE_FIXTURE,
  TRAINING_NORTHWEST_LINE_FIXTURE,
  TRAINING_SUBURB_LINE_FIXTURE,
  TRAINING_WEST_LINE_FIXTURE,
} from './line'

export type TrainingStationFixture = Pick<
  Station,
  | 'id'
  | 'groupId'
  | 'name'
  | 'nameKatakana'
  | 'nameRoman'
  | 'stationNumbers'
  | 'line'
  | 'lines'
  | 'stopCondition'
>

export const TRAINING_LINE_STATIONS_FIXTURE_LOCAL: TrainingStationFixture[] =
  new Array(10).fill(null).flatMap((_, idx) => [
    {
      id: idx,
      groupId: idx,
      name: `訓練${idx + 1}`,
      nameKatakana: `クンレン${idx + 1}`,
      nameRoman: `Training ${idx + 1}`,
      stationNumbers: [
        {
          lineSymbol: 'T',
          lineSymbolColor: '#00bb85',
          lineSymbolShape: MARK_SHAPE.ROUND,
          stationNumber: `T-0${idx + 1}`,
        },
      ] as StationNumber[],
      line: TRAINING_CENTRAL_LINE_FIXTURE as Line,
      lines:
        idx % 2 === 0
          ? ([
              TRAINING_CENTRAL_LINE_FIXTURE,
              TRAINING_EAST_LINE_FIXTURE,
              TRAINING_NORTHEAST_LINE_FIXTURE,
            ] as Line[])
          : ([
              TRAINING_CENTRAL_LINE_FIXTURE,
              TRAINING_WEST_LINE_FIXTURE,
              TRAINING_NORTHWEST_LINE_FIXTURE,
            ] as Line[]),
      stopCondition: StopCondition.All,
    },
  ])

export const TRAINING_LINE_STATIONS_FIXTURE_EXPRESS: TrainingStationFixture[] =
  [
    ...new Array(10).fill(null).map((_, idx) => [
      {
        id: idx,
        groupId: idx,
        name: `訓練${idx + 1}`,
        nameKatakana: `クンレン${idx + 1}`,
        nameRoman: `Training ${idx + 1}`,
        stationNumbers: [
          {
            lineSymbol: 'T',
            lineSymbolColor: '#009BBF',
            lineSymbolShape: MARK_SHAPE.ROUND,
            stationNumber: `T-0${idx + 1}`,
          },
        ] as StationNumber[],
        line: TRAINING_CENTRAL_LINE_FIXTURE as Line,
        lines:
          idx % 2 === 0
            ? ([
                TRAINING_CENTRAL_LINE_FIXTURE,
                TRAINING_EAST_LINE_FIXTURE,
                TRAINING_NORTHEAST_LINE_FIXTURE,
              ] as Line[])
            : ([
                TRAINING_CENTRAL_LINE_FIXTURE,
                TRAINING_WEST_LINE_FIXTURE,
                TRAINING_NORTHWEST_LINE_FIXTURE,
              ] as Line[]),
        stopCondition: idx !== 8 ? StopCondition.All : StopCondition.Not,
      },
    ]),
    ...new Array(2).fill(null).map((_, idx) => [
      {
        id: idx + 10,
        groupId: idx + 10,
        name: `訓練郊外${idx + 1}`,
        nameKatakana: `クンレンコウガイ${idx + 1}`,
        nameRoman: `Training Suburb ${idx + 1}`,
        stationNumbers: [
          {
            lineSymbol: 'S',
            lineSymbolColor: '#B3C146',
            lineSymbolShape: MARK_SHAPE.ROUND,
            stationNumber: `S-0${idx + 1}`,
          },
        ] as StationNumber[],
        line: TRAINING_SUBURB_LINE_FIXTURE as Line,
        lines: [TRAINING_SUBURB_LINE_FIXTURE] as Line[],
        stopCondition: StopCondition.All,
      },
    ]),
  ].flat()
