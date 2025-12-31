import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';

// モジュールをモックしてフックの依存を制御
jest.mock('jotai', () => ({
  __esModule: true,
  useAtomValue: jest.fn(),
  atom: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({ useCurrentStation: jest.fn() }));
jest.mock('./useLoopLine', () => ({ useLoopLine: jest.fn() }));
jest.mock('../utils/trainTypeString', () => ({ getIsLocal: jest.fn() }));

import { useAtomValue } from 'jotai';
import { getIsLocal } from '../utils/trainTypeString';
import { useBounds } from './useBounds';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

const TestComponent: React.FC<{ stations: Station[] }> = ({ stations }) => {
  const { bounds, directionalStops } = useBounds(stations);
  return (
    <>
      <Text testID="bounds">{JSON.stringify(bounds)}</Text>
      <Text testID="directionalStops">{JSON.stringify(directionalStops)}</Text>
    </>
  );
};

describe('useBounds フック', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('非環状線・非大江戸線のときは先頭/末尾が bounds になる', () => {
    // stationState, navigationState の順で返される
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      trainType: 'EXPRESS',
    }));

    // currentStation は未使用のケースなので null
    (useCurrentStation as jest.Mock).mockReturnValue(null);

    // 環状線フラグ false にする
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(false);

    const stations = [
      { id: 1, groupId: 'g' },
      { id: 2, groupId: 'g' },
      { id: 3, groupId: 'g' },
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    // inbound は最後の駅 (id:3)、outbound は先頭の駅 (id:1)
    expect(getByTestId('bounds').props.children).toContain('"id":3');
    expect(getByTestId('bounds').props.children).toContain('"id":1');

    // directionalStops は INBOUND 側の先頭要素（末尾駅）を含む
    expect(getByTestId('directionalStops').props.children).toContain('"id":3');
  });

  it('環状線のときは useLoopLine の返す配列が bounds になる', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      trainType: undefined,
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);
    (getIsLocal as jest.Mock).mockReturnValue(false);

    const inboundLoop = [{ id: 10 }, { id: 11 }] as unknown as Station[];
    const outboundLoop = [{ id: 20 }, { id: 21 }] as unknown as Station[];
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: true,
      isOedoLine: false,
      inboundStationsForLoopLine: inboundLoop,
      outboundStationsForLoopLine: outboundLoop,
    });

    const stations: Station[] = [{ id: 0, groupId: 'g' } as unknown as Station];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    // bounds と directionalStops に loop の配列が反映される
    expect(getByTestId('bounds').props.children).toContain('"id":10');
    expect(getByTestId('bounds').props.children).toContain('"id":20');
    expect(getByTestId('directionalStops').props.children).toContain('"id":10');
  });

  it('selectedBound があり該当方向の slicedBounds が空なら selectedBound を返す', () => {
    // selectedDirection と selectedBound を返す
    const selectedBound = { id: 99 };
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      trainType: 'EXPRESS',
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(false);

    const stations: Station[] = []; // bounds が空になる
    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('directionalStops').props.children).toContain('"id":99');
  });
});
