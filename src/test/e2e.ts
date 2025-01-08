import { FlattenObject } from '../utils/type'

export const TestIds = {
  Button: {
    FakeStationSettings: 'FakeStationSettings',
  },
  Input: {
    StationNameQuery: 'StationNameQuery',
  },
} as const

export type TestId = FlattenObject<typeof TestIds>
export type ButtonTestId = (typeof TestIds.Button)[keyof typeof TestIds.Button]
