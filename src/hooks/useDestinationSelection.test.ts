import {
  type Station,
  StopCondition,
  type TrainTypeNested,
} from '~/@types/graphql';
import { getConnectedRouteSegment } from './useDestinationSelection';

jest.mock('~/lib/gql', () => ({
  gqlRequest: jest.fn(),
  graphqlQueryKey: jest.fn(),
}));

const station = (groupId: number): Station =>
  ({ id: groupId, groupId }) as Station;

describe('getConnectedRouteSegment', () => {
  const route = [1, 2, 3, 4, 5].map(station);

  it('現在駅から目的駅までに切り詰める', () => {
    expect(getConnectedRouteSegment(route, 2, 4)).toEqual([
      station(2),
      station(3),
      station(4),
    ]);
  });

  it('逆向きの経路は現在駅から目的駅の順に並べる', () => {
    expect(getConnectedRouteSegment(route, 4, 2)).toEqual([
      station(4),
      station(3),
      station(2),
    ]);
  });

  it('連結APIの駅情報をそのまま保持する', () => {
    const trainType = { groupId: 10, name: '快速' } as TrainTypeNested;
    const route = [
      { ...station(1), trainType, stopCondition: StopCondition.All },
      { ...station(2), trainType, stopCondition: StopCondition.Not },
    ];

    const result = getConnectedRouteSegment(route, 1, 2);

    expect(result[0].trainType).toBe(trainType);
    expect(result[1].stopCondition).toBe(StopCondition.Not);
  });
});
