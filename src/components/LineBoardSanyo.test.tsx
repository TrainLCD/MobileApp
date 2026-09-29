import { act, fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import LineBoardSanyo, {
  getPassBetween,
  SANYO_BAR_COLORS,
  SANYO_PASSED_BAR_COLORS,
} from './LineBoardSanyo';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(),
}));

jest.mock('~/hooks', () => ({
  useDisplayCurrentStation: jest.fn(),
  useStationNumberIndexFunc: jest.fn(() => () => 0),
  useTransferLinesFromStation: jest.fn(() => []),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(
    (s: { stopCondition?: string }) => s.stopCondition === 'NOT'
  ),
}));

jest.mock('./PadLineMarks', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('LineBoardSanyo', () => {
  const { useAtomValue } = require('jotai');
  const { useDisplayCurrentStation } = require('~/hooks');
  const { arrivedAtom, stationsAtom } = require('~/store/atoms/station');
  const { headerStateAtom } = require('~/store/atoms/navigation');

  // 直通先の阪神本線。路線色は山陽のバーの色と異なる
  const hanshinLine = {
    __typename: 'Line',
    id: 1,
    nameShort: '阪神本線',
    color: '#0068B7',
  } as Line;

  const makeStation = (
    id: number,
    name: string,
    stationNumber: string,
    extra: Partial<Station> = {}
  ): Station =>
    ({
      id,
      groupId: id,
      name,
      line: hanshinLine,
      stationNumbers: [
        {
          __typename: 'StationNumber',
          lineSymbol: 'HS',
          lineSymbolColor: '#0068B7',
          lineSymbolShape: 'SANYO',
          stationNumber,
        },
      ],
      ...extra,
    }) as unknown as Station;

  const stations = [
    makeStation(1, '魚崎', 'HS-24', { stopCondition: 'NOT' } as never),
    makeStation(2, '阪神御影', 'HS-25'),
    makeStation(3, '元町', 'HS-33'),
  ];

  let arrived = false;
  let headerState = 'NEXT';
  let allStations: Station[] = [];

  // 行の大きさが分かってから駅を描くため、レイアウトを発火させる
  const renderBoard = () => {
    const utils = render(
      <LineBoardSanyo stations={stations} hasTerminus={false} />
    );
    const row = utils.UNSAFE_root.findAll(
      (n) => typeof n.props.onLayout === 'function'
    )[0];
    act(() => {
      fireEvent(row, 'layout', {
        nativeEvent: { layout: { width: 800, height: 300 } },
      });
    });
    return utils;
  };

  beforeEach(() => {
    arrived = false;
    headerState = 'NEXT';
    allStations = stations;
    useAtomValue.mockImplementation((a: unknown) =>
      a === arrivedAtom
        ? arrived
        : a === headerStateAtom
          ? headerState
          : a === stationsAtom
            ? allStations
            : false
    );
    // 魚崎を出て阪神御影へ向かっている状態
    useDisplayCurrentStation.mockReturnValue(stations[0]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('直通先の区間でもバーを路線色でなく山陽の2色で塗り、通過済みの区間は灰色にする', () => {
    const { getAllByTestId } = renderBoard();
    const gradients = getAllByTestId('sanyoBarFill').map(
      (n) => n.props.accessibilityHint
    );
    expect(gradients).toEqual([
      SANYO_PASSED_BAR_COLORS.top,
      SANYO_BAR_COLORS.top,
      SANYO_BAR_COLORS.top,
    ]);
    expect(gradients).not.toContain('#0068B7');
  });

  it('現在位置の青い矢印を1つだけ出す', () => {
    const { getAllByTestId } = renderBoard();
    expect(getAllByTestId('currentChevronSanyo')).toHaveLength(1);
  });

  it('停車中は現在駅の枠を灰色にせず、駅番号の箱を青くして示す', () => {
    arrived = true;
    useDisplayCurrentStation.mockReturnValue(stations[1]);
    const { getAllByTestId, getByTestId } = renderBoard();
    const gradients = getAllByTestId('sanyoBarFill').map(
      (n) => n.props.accessibilityHint
    );
    expect(gradients).toEqual([
      SANYO_PASSED_BAR_COLORS.top,
      SANYO_BAR_COLORS.top,
      SANYO_BAR_COLORS.top,
    ]);
    expect(getByTestId('currentNumberBoxSanyo')).toBeTruthy();
  });

  it('補足の行が中国語の間も、路線図の駅名は日本語の縦書きのまま出す', () => {
    headerState = 'NEXT_ZH';
    const { getByText } = renderBoard();
    expect(getByText('元')).toBeTruthy();
    expect(getByText('町')).toBeTruthy();
  });

  it('駅名を1文字ずつ縦に並べる', () => {
    const { getByText } = renderBoard();
    expect(getByText('元')).toBeTruthy();
    expect(getByText('町')).toBeTruthy();
  });

  it('駅番号は路線記号の色に関わらず濃い灰色で、通過駅は灰色で出す', () => {
    const { getByText } = renderBoard();
    const colorOf = (text: string) =>
      (StyleSheet.flatten(getByText(text).props.style) as { color?: string })
        .color;
    expect(colorOf('33')).toBe('#444');
    expect(colorOf('24')).toBe('#B4B4B4');
  });

  it('間に通過駅がある駅の手前にだけ白い「>」を置く', () => {
    const passed = { id: 90, groupId: 90, stopCondition: 'NOT' } as never;
    // 魚崎と阪神御影の間は隣駅、阪神御影と元町の間に通過駅がある
    allStations = [stations[0], stations[1], passed, stations[2]];
    const { getAllByTestId } = renderBoard();
    expect(getAllByTestId('smallChevronSanyo')).toHaveLength(1);
  });
});

describe('getPassBetween', () => {
  const st = (id: number, pass = false) =>
    ({ id, groupId: id, stopCondition: pass ? 'NOT' : 'ALL' }) as never;

  it('表示する隣り合う駅の間に通過駅があるかを返す', () => {
    const all = [st(1), st(2, true), st(3), st(4), st(5, true), st(6)];
    expect(getPassBetween([st(1), st(3), st(4), st(6)], all)).toEqual([
      true,
      false,
      true,
    ]);
  });

  it('逆向きに並んでいても判定できる', () => {
    const all = [st(1), st(2, true), st(3)];
    expect(getPassBetween([st(3), st(1)], all)).toEqual([true]);
  });
});
