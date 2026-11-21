import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import { TransportType } from '~/@types/graphql';
import { createLine, createStation } from '~/utils/test/factories';
import { useNearbyBusLines } from './useNearbyBusLines';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));
jest.mock('~/lib/gql', () => ({
  graphqlQueryKey: (_: unknown, coords: object) => [coords],
}));

it('現在地の有無に応じてバス路線を切り替え、同じ路線は近い乗り場を残す', () => {
  const rail = createLine(1);
  const stationBus = createLine(2, { transportType: TransportType.Bus });
  const bus = createLine(3, { transportType: TransportType.Bus });
  const station = createStation(1, {
    lines: [rail, stationBus].map((line) => ({
      ...line,
      __typename: 'LineNested' as const,
    })),
  });
  (useQuery as jest.Mock).mockReturnValue({
    data: {
      nearbyBusStops: [
        { line: bus },
        { line: { ...bus, nameShort: '遠い乗り場' } },
      ],
    },
  });
  (useAtomValue as jest.Mock).mockReturnValue(null);
  const { result, rerender } = renderHook(() => useNearbyBusLines(station));
  expect(result.current).toBe(station);
  expect(useQuery).toHaveBeenLastCalledWith(
    expect.objectContaining({ enabled: false })
  );

  const coords = { latitude: 35, longitude: 139 };
  (useAtomValue as jest.Mock).mockReturnValue({ coords });
  rerender({});
  expect(useQuery).toHaveBeenLastCalledWith(
    expect.objectContaining({ queryKey: [coords], enabled: true })
  );
  expect(result.current?.lines).toEqual([station.lines?.[0], bus]);
});
