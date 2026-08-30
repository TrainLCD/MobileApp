import { render } from '@testing-library/react-native';
import type { Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import LineBoardLowPower from './LineBoardLowPower';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

jest.mock('~/hooks', () => ({
  useLowPowerLayout: jest.fn(() => ({
    width: 720,
    height: 360,
    scale: 1,
    insets: { top: 0, right: 0, bottom: 0, left: 0 },
  })),
  useDisplayCurrentStation: jest.fn(),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
  useTransferLinesFromStation: jest.fn(() => []),
}));

const { useAtomValue } = require('jotai');
const {
  useDisplayCurrentStation,
  useEstimatedMinutesByStationId,
  useLowPowerLayout,
  useTransferLinesFromStation,
} = require('~/hooks');
const { headerStateAtom } = require('~/store/atoms/navigation');
const { arrivedAtom } = require('~/store/atoms/station');
const { isEnAtom } = require('~/store/selectors/isEn');

const makeStation = (id: number, name: string, nameRoman: string): Station =>
  ({
    id,
    groupId: id * 10,
    name,
    nameRoman,
    stopCondition: StopCondition.All,
  }) as unknown as Station;

const STATIONS = [
  makeStation(1, '都立大学', 'Toritsu-daigaku'),
  makeStation(2, '自由が丘', 'Jiyugaoka'),
  makeStation(3, '田園調布', 'Den-en-chofu'),
  makeStation(4, '多摩川', 'Tamagawa'),
];

const setAtomValues = ({
  arrived = false,
  headerState = 'NEXT',
  isEn = false,
}: {
  arrived?: boolean;
  headerState?: string;
  isEn?: boolean;
} = {}) => {
  useAtomValue.mockImplementation((atom: unknown) => {
    if (atom === arrivedAtom) return arrived;
    if (atom === headerStateAtom) return headerState;
    if (atom === isEnAtom) return isEn;
    return undefined;
  });
};

const markerLeft = (element: { props: { style?: unknown } }) => {
  const style = element.props.style as { left?: string };
  return style.left;
};

describe('LineBoardLowPower', () => {
  beforeEach(() => {
    setAtomValues();
    useLowPowerLayout.mockReturnValue({
      width: 720,
      height: 360,
      scale: 1,
      insets: NO_INSETS,
    });
    useDisplayCurrentStation.mockReturnValue(STATIONS[0]);
    useEstimatedMinutesByStationId.mockReturnValue(new Map());
    useTransferLinesFromStation.mockReturnValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('渡された駅をすべて水平に並べる', () => {
    const { getByText } = render(<LineBoardLowPower stations={STATIONS} />);

    for (const station of STATIONS) {
      expect(getByText(station.name as string)).toBeTruthy();
    }
  });

  it('英語表示ではローマ字の駅名に切り替わる', () => {
    setAtomValues({ isEn: true });
    const { getByText, queryByText } = render(
      <LineBoardLowPower stations={STATIONS} />
    );

    expect(getByText('Jiyugaoka')).toBeTruthy();
    expect(queryByText('自由が丘')).toBeNull();
  });

  it('到着分は取得できた駅だけに出し、先頭列は単位の見出しにする', () => {
    useEstimatedMinutesByStationId.mockReturnValue(
      new Map([
        [2, 2],
        [3, 4.4],
      ])
    );
    const { getByText, queryByText } = render(
      <LineBoardLowPower stations={STATIONS} />
    );

    expect(getByText('分')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    // 小数は四捨五入して整数で出す
    expect(getByText('4')).toBeTruthy();
    expect(queryByText('4.4')).toBeNull();
  });

  it('停車中は列車位置を現在駅の真上に置く', () => {
    setAtomValues({ arrived: true });
    const { getByTestId } = render(<LineBoardLowPower stations={STATIONS} />);

    // 4列なので1列あたり25%、先頭列の中心は12.5%
    expect(markerLeft(getByTestId('low-power-line-board-marker'))).toBe(
      '12.5%'
    );
  });

  it('接近中は列車位置を次駅寄りへ動かす', () => {
    const runningView = render(<LineBoardLowPower stations={STATIONS} />);
    const running = markerLeft(
      runningView.getByTestId('low-power-line-board-marker')
    );

    // React.memo が効くので、状態を変えたら別インスタンスとして描画し直す
    setAtomValues({ headerState: 'ARRIVING' });
    const arrivingView = render(<LineBoardLowPower stations={STATIONS} />);
    const arriving = markerLeft(
      arrivingView.getByTestId('low-power-line-board-marker')
    );

    expect(Number.parseFloat(running as string)).toBeGreaterThan(12.5);
    expect(Number.parseFloat(arriving as string)).toBeGreaterThan(
      Number.parseFloat(running as string)
    );
  });

  it('乗換路線の記号を上限まで並べ、あふれた分は「+N」に畳む', () => {
    useTransferLinesFromStation.mockReturnValue([
      { lineSymbols: [{ symbol: 'JY' }] },
      { lineSymbols: [{ symbol: 'G' }] },
      { lineSymbols: [{ symbol: 'Z' }] },
      { lineSymbols: [] },
    ]);
    const { getAllByText } = render(
      <LineBoardLowPower stations={[STATIONS[0]]} />
    );

    expect(getAllByText('JY')).toHaveLength(1);
    expect(getAllByText('G')).toHaveLength(1);
    expect(getAllByText('+2')).toHaveLength(1);
  });

  it('groupId が重複していても stationId で現在駅を特定する', () => {
    // 6の字運転では同じ駅が groupId を共有したまま複数回現れる。
    // groupId で引くと最初の出現を掴んでしまい、列車位置・現在駅マーク・
    // 通過済み表示がすべて別の位置に出る
    const loop = [
      { ...makeStation(101, '都庁前', 'Tochomae'), groupId: 999 },
      { ...makeStation(102, '新宿西口', 'Shinjuku-nishiguchi'), groupId: 500 },
      { ...makeStation(103, '都庁前', 'Tochomae'), groupId: 999 },
      { ...makeStation(104, '光が丘', 'Hikarigaoka'), groupId: 501 },
    ] as unknown as Station[];
    setAtomValues({ arrived: true });
    useDisplayCurrentStation.mockReturnValue(loop[2]);

    const { getByTestId } = render(<LineBoardLowPower stations={loop} />);

    // 4列なので1列あたり25%。3列目(index 2)の中心は62.5%
    expect(markerLeft(getByTestId('low-power-line-board-marker'))).toBe(
      '62.5%'
    );
  });

  it('stationId が一致しないときは groupId へ落とす', () => {
    // useDisplayCurrentStation は stations とは別経路の駅を返すことがあり、
    // id で引けない。その場合に先頭駅へ黙って落ちないことを担保する
    setAtomValues({ arrived: true });
    useDisplayCurrentStation.mockReturnValue({
      ...STATIONS[2],
      id: 9999,
    } as unknown as Station);

    const { getByTestId } = render(<LineBoardLowPower stations={STATIONS} />);

    expect(markerLeft(getByTestId('low-power-line-board-marker'))).toBe(
      '62.5%'
    );
  });

  it('駅が空でも落ちない', () => {
    expect(() => render(<LineBoardLowPower stations={[]} />)).not.toThrow();
  });

  it('セーフエリアぶんを下端と左右の余白として確保する', () => {
    // 上端が非ゼロの端末を想定する。ストリップの上端は画面上端ではなく
    // ヘッダーの直下なので、insets.top を足さないことも併せて確かめる
    useLowPowerLayout.mockReturnValue({
      width: 660,
      height: 326,
      scale: 326 / 360,
      insets: { top: 34, right: 21, bottom: 21, left: 39 },
    });

    const { getByTestId } = render(<LineBoardLowPower stations={STATIONS} />);

    const scale = 326 / 360;
    expect(getByTestId('low-power-line-board-root').props.style).toEqual(
      expect.objectContaining({
        // 上端のセーフエリアはヘッダーが引き受けるため、ここでは足さない
        paddingTop: 6 * scale,
        paddingBottom: 4 * scale + 21,
        paddingLeft: 16 * scale + 39,
        paddingRight: 16 * scale + 21,
      })
    );
  });
});
