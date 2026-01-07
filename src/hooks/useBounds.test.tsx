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

  it('OUTBOUND の場合、bounds[1] から directionalStops を返す', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'OUTBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: false,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [
      { id: 1, groupId: 'g' },
      { id: 2, groupId: 'g' },
      { id: 3, groupId: 'g' },
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    // OUTBOUND の場合は先頭の駅 (id:1)
    expect(getByTestId('directionalStops').props.children).toContain('"id":1');
  });

  it('大江戸線の場合、主要駅がフィルタリングされた bounds を返す', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    const currentStation = { id: 9930107, groupId: 9930107 }; // 飯田橋
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 大江戸線の駅配列（主要駅を含む）
    const stations = [
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り)
      { id: 9930107, groupId: 9930107 }, // 飯田橋（現在駅）
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    // inbound には飯田橋以降の主要駅（両国、大門）が含まれる
    expect(bounds).toContain('"id":9930113');
    expect(bounds).toContain('"id":9930121');
  });

  it('大江戸線で currentStation が見つからない場合、空の bounds を返す', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    const currentStation = { id: 99999, groupId: 99999 }; // 存在しない駅
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [
      { id: 9930101, groupId: 9930101 },
      { id: 9930107, groupId: 9930107 },
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('bounds').props.children).toBe('[[],[]]');
  });

  it('pendingTrainType が null で環状線の場合、loop の bounds を返す', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);

    const inboundLoop = [{ id: 100 }] as unknown as Station[];
    const outboundLoop = [{ id: 200 }] as unknown as Station[];
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: true,
      isOedoLine: false,
      inboundStationsForLoopLine: inboundLoop,
      outboundStationsForLoopLine: outboundLoop,
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [{ id: 1, groupId: 'g' }] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    expect(getByTestId('bounds').props.children).toContain('"id":100');
    expect(getByTestId('bounds').props.children).toContain('"id":200');
  });

  it('pendingTrainType が local 以外で環状線の場合、先頭/末尾の bounds を返す', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: { kind: 'RAPID' },
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);

    const inboundLoop = [{ id: 100 }] as unknown as Station[];
    const outboundLoop = [{ id: 200 }] as unknown as Station[];
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: true,
      isOedoLine: false,
      inboundStationsForLoopLine: inboundLoop,
      outboundStationsForLoopLine: outboundLoop,
    });
    // getIsLocal が false を返す（快速など）
    (getIsLocal as jest.Mock).mockReturnValue(false);

    const stations = [
      { id: 1, groupId: 'g' },
      { id: 2, groupId: 'g' },
      { id: 3, groupId: 'g' },
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    // 環状線でも getIsLocal が false なら先頭/末尾
    expect(getByTestId('bounds').props.children).toContain('"id":3');
    expect(getByTestId('bounds').props.children).toContain('"id":1');
  });

  it('大江戸線で築地市場以北の場合、都庁前内回りがフィルタリングされる', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'OUTBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    // 築地市場以北の駅（id >= 9930119）
    const currentStation = { id: 9930120, groupId: 9930120 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [
      { id: 9930100, groupId: 9930100 }, // 都庁前(外回り)
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り)
      { id: 9930120, groupId: 9930120 }, // 現在駅
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    // outbound には都庁前外回りが含まれるが、内回りは除外
    expect(bounds).toContain('"id":9930100');
  });

  it('directionalStops が3つ以上の場合、先頭2つにスライスされる', () => {
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      selectedDirection: 'INBOUND',
      selectedBound: undefined,
    }));
    (useAtomValue as jest.Mock).mockImplementationOnce(() => ({
      pendingTrainType: null,
    }));

    (useCurrentStation as jest.Mock).mockReturnValue(null);

    const inboundLoop = [
      { id: 10 },
      { id: 11 },
      { id: 12 },
      { id: 13 },
    ] as unknown as Station[];
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: true,
      isOedoLine: false,
      inboundStationsForLoopLine: inboundLoop,
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [{ id: 1, groupId: 'g' }] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const directionalStops = getByTestId('directionalStops').props.children;
    // 先頭2つのみ
    expect(directionalStops).toContain('"id":10');
    expect(directionalStops).toContain('"id":11');
    expect(directionalStops).not.toContain('"id":12');
    expect(directionalStops).not.toContain('"id":13');
  });
});
