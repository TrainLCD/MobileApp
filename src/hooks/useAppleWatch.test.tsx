import { renderHook } from '@testing-library/react-native';
import { createStore, Provider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import {
  sendMessage,
  updateApplicationContext,
  useReachability,
} from 'react-native-watch-connectivity';
import { type LineNested, TransportType } from '~/@types/graphql';
import { selectedLineAtom } from '~/store/atoms/line';
import { arrivedAtom, stationAtom, stationsAtom } from '~/store/atoms/station';
import { isJapanese } from '~/translation';
import { createLine, createStation } from '~/utils/test/factories';
import { useAppleWatch } from './useAppleWatch';
import { useDisplayNextStation } from './useDisplayNextStation';

jest.mock('react-native-watch-connectivity', () => ({
  sendMessage: jest.fn(),
  updateApplicationContext: jest.fn(),
  useReachability: jest.fn(),
}));

jest.mock('./useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

it.each(
  [TransportType.Bus, TransportType.Rail].flatMap((transportType) =>
    [true, false].flatMap((arrived) =>
      [true, false].map((reachable) => ({ transportType, arrived, reachable }))
    )
  )
)(
  '乗換候補からバス路線を除く (乗車路線: $transportType, 到着済み: $arrived, 接続中: $reachable)',
  ({ transportType, arrived, reachable }) => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(useReachability).mockReturnValue(reachable);

    const selectedLine = createLine(1, { transportType });
    const currentLine: LineNested = {
      ...selectedLine,
      __typename: 'LineNested',
    };
    const currentStation = createStation(10, { line: currentLine });
    const transferStop = createStation(11, {
      line: currentLine,
      lines: [
        currentLine,
        {
          ...createLine(2, {
            nameShort: '都02',
            transportType: TransportType.Bus,
          }),
          __typename: 'LineNested',
        },
        {
          ...createLine(3, {
            nameShort: '丸ノ内線',
            nameRoman: 'Marunouchi Line',
            transportType: TransportType.Rail,
            station: {
              ...createStation(30, {
                name: '新大塚',
                nameRoman: 'Shin-otsuka',
              }),
              __typename: 'StationNested',
            },
          }),
          __typename: 'LineNested',
        },
      ],
    });
    jest.mocked(useDisplayNextStation).mockReturnValue(transferStop);

    const store = createStore();
    store.set(arrivedAtom, arrived);
    store.set(selectedLineAtom, selectedLine);
    store.set(stationAtom, arrived ? transferStop : currentStation);
    store.set(stationsAtom, [currentStation, transferStop]);
    renderHook(() => useAppleWatch(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
      ),
    });

    const send = reachable ? sendMessage : updateApplicationContext;
    expect(jest.mocked(send).mock.lastCall?.[0]).toMatchObject({
      station: {
        id: transferStop.id,
        lines: [
          {
            id: 3,
            name: isJapanese ? '丸ノ内線' : 'Marunouchi Line',
          },
        ],
      },
    });
  }
);
