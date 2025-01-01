export const TestIds = {
  Button: {
    FakeStationSettings: 'FakeStationSettings',
  },
  Input: {
    StationNameQuery: 'StationNameQuery',
  },
} as const

export type TestId = (typeof TestIds)[keyof typeof TestIds]
export type ButtonTestId = (typeof TestIds.Button)[keyof typeof TestIds.Button]
