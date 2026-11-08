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

it.each([true, false])(
  'バス走行中は鉄道路線名だけをウォッチに送る (停留所に到着済み: %s)',
  (arrived) => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    jest.mocked(useReachability).mockReturnValue(arrived);

    const busLine = createLine(1, { transportType: TransportType.Bus });
    const currentBusLine: LineNested = { ...busLine, __typename: 'LineNested' };
    const busStop = createStation(10, { line: currentBusLine });
    const transferStop = createStation(11, {
      line: currentBusLine,
      lines: [
        currentBusLine,
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
    store.set(selectedLineAtom, busLine);
    store.set(stationAtom, arrived ? transferStop : busStop);
    store.set(stationsAtom, [busStop, transferStop]);
    renderHook(() => useAppleWatch(), {
      wrapper: ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
      ),
    });

    const send = arrived ? sendMessage : updateApplicationContext;
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
