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
  const { bounds, directionalStops, boundCandidates } = useBounds(stations);
  return (
    <>
      <Text testID="bounds">{JSON.stringify(bounds)}</Text>
      <Text testID="directionalStops">{JSON.stringify(directionalStops)}</Text>
      <Text testID="boundCandidates">
        {JSON.stringify(
          boundCandidates.map((candidate) => ({
            direction: candidate.direction,
            boardingStationId: candidate.boardingStation?.id ?? null,
            stopIds: candidate.stops.map((s) => s.id),
          }))
        )}
      </Text>
    </>
  );
};

type SerializedCandidate = {
  direction: 'INBOUND' | 'OUTBOUND';
  boardingStationId: number | null;
  stopIds: number[];
};

const getCandidates = (
  getByTestId: (id: string) => { props: { children?: unknown } }
) =>
  JSON.parse(
    String(getByTestId('boundCandidates').props.children)
  ) as SerializedCandidate[];

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

  it('大江戸線で現在駅が他路線レコード(JR新宿など)の場合、groupIdで読み替えて bounds を返す', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    // 新宿の最寄り駅としてJR側のレコードが現在駅になっているケース。
    // idは大江戸線の駅リストに存在しないが、groupIdは大江戸線新宿と共通。
    const currentStation = { id: 1130224, groupId: 1130224 }; // JR新宿
    (useCurrentStation as jest.Mock).mockReturnValue(currentStation);
    (useLoopLine as jest.Mock).mockReturnValue({
      isLoopLine: false,
      isOedoLine: true,
      inboundStationsForLoopLine: [],
      outboundStationsForLoopLine: [],
    });
    (getIsLocal as jest.Mock).mockReturnValue(true);

    const stations = [
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
      { id: 9930100, groupId: 100 }, // 都庁前(外回り)
      { id: 9930128, groupId: 1130224 }, // 大江戸線新宿 - JR新宿とgroupIdが同じ
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
    ] as unknown as Station[];
    const { getByTestId } = render(<TestComponent stations={stations} />);

    const bounds = getByTestId('bounds').props.children;
    const [inboundStops, outboundStops] = JSON.parse(bounds) as {
      id: number;
    }[][];
    // inbound には新宿より後方の主要駅（大門、両国）が含まれる
    expect(inboundStops.map((s) => s.id)).toEqual([9930121, 9930113]);
    // outbound には都庁前(外回り)と光が丘が含まれる
    expect(outboundStops.map((s) => s.id)).toEqual([9930100, 9930138]);
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

  describe('大江戸線 都庁前の方面カード候補', () => {
    // 都庁前は環状部の起終点かつ光が丘方面の分岐点であるため、駅配列に2回出現する。
    // 実データの並び(都庁前(内) → 環状部 → 都庁前(外) → 光が丘方面)を縮約して再現する。
    const TOCHOMAE_GROUP_ID = 1130225;
    const oedoStations = [
      { id: 9930101, groupId: TOCHOMAE_GROUP_ID }, // 都庁前(内回り)
      { id: 9930107, groupId: 9930107 }, // 飯田橋（主要駅）
      { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
      { id: 9930121, groupId: 9930121 }, // 大門（主要駅）
      { id: 9930124, groupId: 9930124 }, // 六本木（主要駅）
      { id: 9930128, groupId: 1130208 }, // 新宿
      { id: 9930100, groupId: TOCHOMAE_GROUP_ID }, // 都庁前(外回り)
      { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
    ] as unknown as Station[];

    const setupOedo = () => {
      setAtomValues({ selectedDirection: 'INBOUND' });
      (useLoopLine as jest.Mock).mockReturnValue({
        isLoopLine: false,
        isOedoLine: true,
        inboundStationsForLoopLine: [],
        outboundStationsForLoopLine: [],
      });
      (getIsLocal as jest.Mock).mockReturnValue(true);
    };

    // GPSが内回り・外回りどちらのレコードを返しても案内する方面は変わらない
    it.each([
      ['内回り', 9930101],
      ['外回り', 9930100],
    ])(
      '現在駅が都庁前(%s)のとき、光が丘・六本木大門・飯田橋両国の3方向を返す',
      (_label, currentStationId) => {
        setupOedo();
        (useCurrentStation as jest.Mock).mockReturnValue({
          id: currentStationId,
          groupId: TOCHOMAE_GROUP_ID,
        });

        const { getByTestId } = render(
          <TestComponent stations={oedoStations} />
        );

        expect(getCandidates(getByTestId)).toEqual([
          // 都庁前始発の光が丘方面(環状部を通らない直通)
          {
            direction: 'INBOUND',
            boardingStationId: 9930100,
            stopIds: [9930138],
          },
          // 外回り(六本木・大門方面)。終点は都庁前(内回り)
          {
            direction: 'OUTBOUND',
            boardingStationId: 9930100,
            stopIds: [9930124, 9930121, 9930113, 9930107, 9930101],
          },
          // 内回り(飯田橋・両国方面)。環状部を回ってから光が丘へ向かう
          {
            direction: 'INBOUND',
            boardingStationId: 9930101,
            stopIds: [9930107, 9930113, 9930121, 9930124, 9930138],
          },
        ]);
      }
    );

    // boundsはinbound/outboundの2枠しか持たないため、都庁前(内回り)基準では
    // outboundが空になる。路線カードの方面ヒントから光が丘が消えないよう補完する。
    it('現在駅が都庁前(内回り)のとき、boundsのoutboundに光が丘を補完する', () => {
      setupOedo();
      (useCurrentStation as jest.Mock).mockReturnValue({
        id: 9930101,
        groupId: TOCHOMAE_GROUP_ID,
      });

      const { getByTestId } = render(<TestComponent stations={oedoStations} />);

      const [inbound, outbound] = JSON.parse(
        String(getByTestId('bounds').props.children)
      ) as { id: number }[][];
      expect(inbound.map((s) => s.id)).toEqual([
        9930107, 9930113, 9930121, 9930124, 9930138,
      ]);
      expect(outbound.map((s) => s.id)).toEqual([9930138]);
    });

    // 外回り出現を基準にした場合はoutboundが六本木・大門方面で埋まるため補完しない
    it('現在駅が都庁前(外回り)のとき、boundsのoutboundは環状部の主要駅になる', () => {
      setupOedo();
      (useCurrentStation as jest.Mock).mockReturnValue({
        id: 9930100,
        groupId: TOCHOMAE_GROUP_ID,
      });

      const { getByTestId } = render(<TestComponent stations={oedoStations} />);

      const [inbound, outbound] = JSON.parse(
        String(getByTestId('bounds').props.children)
      ) as { id: number }[][];
      expect(inbound.map((s) => s.id)).toEqual([9930138]);
      expect(outbound.map((s) => s.id)).toEqual([
        9930124, 9930121, 9930113, 9930107, 9930101,
      ]);
    });

    it('出現ごとの候補が同じ方面を指す場合は1枚に畳む', () => {
      setupOedo();
      (useCurrentStation as jest.Mock).mockReturnValue({
        id: 9930101,
        groupId: TOCHOMAE_GROUP_ID,
      });

      // 都庁前(内回り)と都庁前(外回り)の間に主要駅がないため、
      // どちらから乗ってもINBOUNDの先頭は光が丘になる
      const stations = [
        { id: 9930101, groupId: TOCHOMAE_GROUP_ID }, // 都庁前(内回り)
        { id: 9930128, groupId: 1130208 }, // 新宿
        { id: 9930100, groupId: TOCHOMAE_GROUP_ID }, // 都庁前(外回り)
        { id: 9930138, groupId: 9930138 }, // 光が丘（主要駅）
      ] as unknown as Station[];

      const { getByTestId } = render(<TestComponent stations={stations} />);

      expect(getCandidates(getByTestId)).toEqual([
        {
          direction: 'INBOUND',
          boardingStationId: 9930100,
          stopIds: [9930138],
        },
        {
          direction: 'OUTBOUND',
          boardingStationId: 9930100,
          stopIds: [9930101],
        },
      ]);
    });

    it('都庁前が1回しか現れない経路では通常どおり1方向のみ返す', () => {
      setupOedo();
      (useCurrentStation as jest.Mock).mockReturnValue({
        id: 9930101,
        groupId: TOCHOMAE_GROUP_ID,
      });

      const stations = [
        { id: 9930101, groupId: TOCHOMAE_GROUP_ID }, // 都庁前(内回り) - 現在駅
        { id: 9930107, groupId: 9930107 }, // 飯田橋（主要駅）
        { id: 9930113, groupId: 9930113 }, // 両国（主要駅）
      ] as unknown as Station[];

      const { getByTestId } = render(<TestComponent stations={stations} />);

      expect(getCandidates(getByTestId)).toEqual([
        {
          direction: 'INBOUND',
          boardingStationId: 9930101,
          stopIds: [9930107, 9930113],
        },
      ]);
      // 都庁前より手前に駅がないためoutboundは空のまま
      expect(JSON.parse(getByTestId('bounds').props.children)[1]).toEqual([]);
    });
  });

  it('大江戸線で都庁前以外の駅が現在駅の場合、乗車位置は1箇所だけになる', () => {
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
    // 乗車位置の読み替えが不要なので boardingStation は指定されない
    expect(getCandidates(getByTestId)).toEqual([
      {
        direction: 'INBOUND',
        boardingStationId: null,
        stopIds: [9930113, 9930121, 9930138],
      },
    ]);
  });

  it('通常路線では bounds をそのまま inbound/outbound の2候補にする', () => {
    setAtomValues({ selectedDirection: 'INBOUND' });

    (useCurrentStation as jest.Mock).mockReturnValue(null);
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

    expect(getCandidates(getByTestId)).toEqual([
      { direction: 'INBOUND', boardingStationId: null, stopIds: [3] },
      { direction: 'OUTBOUND', boardingStationId: null, stopIds: [1] },
    ]);
  });
});
