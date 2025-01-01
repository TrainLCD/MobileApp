import {
  generateLineTestId,
  generateRouteTestId,
  generateStationGroupTestId,
  generateStationTestId,
  generateTrainTypeTestId,
} from '../../src/utils/generateTestID'

describe('utils/generateTestId.ts', () => {
  it('駅単体ID', () => {
    expect(generateStationTestId({ id: 1 })).toBe('station_1')
  })
  it('駅グループID', () => {
    expect(generateStationGroupTestId({ groupId: 1 })).toBe('station_group_1')
  })
  it('路線ID', () => {
    expect(generateLineTestId({ id: 1 })).toBe('line_1')
  })
  it('種別ID', () => {
    expect(generateTrainTypeTestId({ id: 1 })).toBe('train_type_1')
  })
  it('経路ID', () => {
    expect(generateRouteTestId({ id: 1 })).toBe('route_1')
  })
})
