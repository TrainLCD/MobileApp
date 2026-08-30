import { render } from '@testing-library/react-native';
import type { Station } from '~/@types/graphql';
import { StopCondition } from '~/@types/graphql';
import LineBoardLowPower from './LineBoardLowPower';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: jest.fn(() => ({ width: 720, height: 360 })),
  useDisplayCurrentStation: jest.fn(),
  useEstimateArrivalTimes: jest.fn(() => ({ route: null })),
  useEstimatedMinutesByStationId: jest.fn(() => new Map()),
  useTransferLinesFromStation: jest.fn(() => []),
}));

const { useAtomValue } = require('jotai');
const {
  useDisplayCurrentStation,
  useEstimatedMinutesByStationId,
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

  it('駅が空でも落ちない', () => {
    expect(() => render(<LineBoardLowPower stations={[]} />)).not.toThrow();
  });
});
