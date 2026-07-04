import { render } from '@testing-library/react-native';
import type React from 'react';
import { Text } from 'react-native';
import type { Station } from '~/@types/graphql';

// モジュールをモックしてフックの依存を制御
jest.mock('jotai', () => ({
  __esModule: true,
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));
jest.mock('./useCurrentStation', () => ({ useCurrentStation: jest.fn() }));
jest.mock('./useLoopLine', () => ({ useLoopLine: jest.fn() }));
jest.mock('../utils/trainTypeString', () => ({ getIsLocal: jest.fn() }));

import { useAtomValue } from 'jotai';
import { pendingTrainTypeAtom } from '../store/atoms/navigation';
import {
  selectedBoundAtom,
  selectedDirectionAtom,
} from '../store/atoms/station';
import { getIsLocal } from '../utils/trainTypeString';
import { useBounds } from './useBounds';
import { useCurrentStation } from './useCurrentStation';
import { useLoopLine } from './useLoopLine';

// useBounds が useAtomValue で読むフィールドatomを、atomの同一性で出し分ける
const setAtomValues = ({
  selectedDirection = null,
  selectedBound = null,
  pendingTrainType = null,
}: {
  selectedDirection?: 'INBOUND' | 'OUTBOUND' | null;
  selectedBound?: unknown;
  pendingTrainType?: unknown;
}) => {
  (useAtomValue as jest.Mock).mockImplementation((atom: unknown) => {
    if (atom === selectedDirectionAtom) return selectedDirection;
    if (atom === selectedBoundAtom) return selectedBound;
    if (atom === pendingTrainTypeAtom) return pendingTrainType;
    return undefined;
  });
};

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
    setAtomValues({ selectedDirection: 'INBOUND' });

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
    setAtomValues({ selectedDirection: 'INBOUND' });

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
    setAtomValues({ selectedDirection: 'INBOUND', selectedBound });

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
    setAtomValues({ selectedDirection: 'OUTBOUND' });

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
    setAtomValues({ selectedDirection: 'INBOUND' });

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

  it('groupIdが同じでもidが異なる駅がある場合、id一致で現在地の位置を特定する', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    // 都庁前(内回り: 9930101)が現在駅。groupId(100)は外回り(9930100)と同一だが、
    // idは別々に採番されている。groupIdだけでstationIndexを求めると、配列中で
    // 先に出現する外回り(index 0)に固定され、実際には現在地より手前(outbound側)
    // にあるはずの飯田橋まで inbound(現在地より前方)に含めてしまう。
    const currentStation = { id: 9930101, groupId: 100 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [
      { id: 9930100, groupId: 100 }, // 都庁前(外回り) - 現在駅とgroupIdが同じ
      { id: 9930107, groupId: 9930107 }, // 飯田橋 - 外回りと内回りの間(現在地より手前)
      { id: 9930101, groupId: 100 }, // 都庁前(内回り) - 現在駅
      { id: 9930113, groupId: 9930113 }, // 両国 - 現在地より後方
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    const [inboundStops, outboundStops] = JSON.parse(bounds) as {
      id: number;
    }[][];
    // inbound(bounds[0])には現在地(内回り)より後方の両国のみが含まれる
    expect(inboundStops.map((s) => s.id)).toEqual([9930113]);
    // 現在地より手前の飯田橋はoutbound(bounds[1])側に含まれるべきで、
    // inboundに誤って混入してはいけない
    expect(outboundStops.map((s) => s.id)).toContain(9930107);
  });

  it('大江戸線で currentStation が見つからない場合、空の bounds を返す', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

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
    setAtomValues({ selectedDirection: 'INBOUND' });

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
    setAtomValues({
      selectedDirection: 'INBOUND',
      pendingTrainType: { kind: 'RAPID' },
    });

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
    setAtomValues({ selectedDirection: 'OUTBOUND' });

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
    setAtomValues({ selectedDirection: 'INBOUND' });

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

  it('大江戸線で都庁前駅(内回り)が現在駅の場合、光が丘方面も表示される', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    // 都庁前駅（内回り: 9930101）が現在駅
    const currentStation = { id: 9930101, groupId: 9930101 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 都庁前が配列の先頭にあるケース（光が丘は後方）
    const stations = [
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り) - 現在駅
      { id: 9930107, groupId: 9930107 }, // 飯田橋（主要駅）
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    // inbound には飯田橋、両国が含まれる
    expect(bounds).toContain('"id":9930107');
    expect(bounds).toContain('"id":9930113');
    // outbound には光が丘が含まれる（都庁前駅の場合の特別処理）
    expect(bounds).toContain('"id":9930138');
  });

  it('大江戸線で都庁前駅(外回り)が現在駅の場合、光が丘方面も表示される', () => {
    setAtomValues({ selectedDirection: 'OUTBOUND' });

    // 都庁前駅（外回り: 9930100）が現在駅
    const currentStation = { id: 9930100, groupId: 9930100 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 都庁前(外回り)が配列の先頭にあるケース
    const stations = [
      { id: 9930100, groupId: 9930100 }, // 都庁前(外回り) - 現在駅
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
      { id: 9930124, groupId: 9930124 }, // 六本木（主要駅）
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    // outbound には光が丘が含まれる（都庁前駅の場合の特別処理）
    expect(bounds).toContain('"id":9930138');
  });

  it('大江戸線で都庁前駅が現在駅で光が丘が既にoutbound側にある場合、重複して追加されない', () => {
    setAtomValues({ selectedDirection: 'OUTBOUND' });

    // 都庁前駅（内回り: 9930101）が現在駅
    const currentStation = { id: 9930101, groupId: 9930101 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 光が丘が都庁前より前にあるケース（通常のoutbound処理で光が丘が含まれる）
    const stations = [
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
      { id: 9930100, groupId: 9930100 }, // 都庁前(外回り)
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り) - 現在駅
      { id: 9930107, groupId: 9930107 }, // 飯田橋（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    // outbound には光が丘が含まれる（通常処理で含まれる）
    expect(bounds).toContain('"id":9930138');
    // 光が丘が1回だけ含まれることを確認（重複がない）
    const boundsArray = JSON.parse(bounds);
    const hikarigaokaCount = boundsArray
      .flat()
      .filter((s: { id: number }) => s.id === 9930138).length;
    expect(hikarigaokaCount).toBe(1);
  });

  it('大江戸線で都庁前駅が現在駅で光が丘が配列に存在しない場合、outboundは空のまま', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    // 都庁前駅（内回り: 9930101）が現在駅
    const currentStation = { id: 9930101, groupId: 9930101 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 光が丘が配列に存在しないケース
    const stations = [
      { id: 9930101, groupId: 9930101 }, // 都庁前(内回り) - 現在駅
      { id: 9930107, groupId: 9930107 }, // 飯田橋（主要駅）
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    const boundsArray = JSON.parse(bounds);
    // inbound には飯田橋、両国が含まれる
    expect(bounds).toContain('"id":9930107');
    expect(bounds).toContain('"id":9930113');
    // outbound は空（光が丘がないため）
    expect(boundsArray[1]).toEqual([]);
  });

  it('大江戸線で都庁前以外の駅が現在駅の場合、光が丘追加の特別処理は適用されない', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    // 飯田橋（9930107）が現在駅
    const currentStation = { id: 9930107, groupId: 9930107 };
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    // 飯田橋が配列の先頭にあるケース
    const stations = [
      { id: 9930107, groupId: 9930107 }, // 飯田橋 - 現在駅
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    const boundsArray = JSON.parse(bounds);
    // inbound には両国、大門、光が丘が含まれる
    expect(bounds).toContain('"id":9930113');
    expect(bounds).toContain('"id":9930121');
    expect(bounds).toContain('"id":9930138');
    // outbound は空（飯田橋より前に主要駅がないため）
    expect(boundsArray[1]).toEqual([]);
  });
});
