import { render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useAfterNextStation } from '~/hooks/useAfterNextStation';
import { useDisplayNextStation } from '~/hooks/useDisplayNextStation';
import { enabledLanguagesAtom } from '~/store/atoms/navigation';
import getIsPass from '~/utils/isPass';
import { StationRow } from './LineBoard/shared/components/StationRow';
import { STATION_NAME_CONTAINER_BOTTOM } from './LineBoard/shared/styles/commonStyles';
import LineBoardE231 from './LineBoardE231';
import LineBoardEast from './LineBoardEast';
import LineBoardJO from './LineBoardJO';
import LineBoardJRKyushu from './LineBoardJRKyushu';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardToei from './LineBoardToei';
import PadLineMarks from './PadLineMarks';
import Typography from './Typography';

jest.mock('~/utils/isTablet', () => ({ __esModule: true, default: true }));
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => false),
}));
jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: () => ({ width: 960, height: 600 }),
  useIsPassing: () => false,
  useCurrentLine: () => ({ id: 1, color: '#c3bd44' }),
  useDisplayCurrentStation: () => ({ groupId: 1 }),
  useEstimateArrivalTimes: () => ({ route: null }),
  useEstimatedMinutesByStationId: () => new Map(),
  useTransferLinesFromStation: () => [{ id: 2, nameShort: '名城線' }],
  useStationNumberIndexFunc: () => () => 0,
}));
jest.mock('~/hooks/useAfterNextStation', () => ({
  useAfterNextStation: jest.fn(),
}));
jest.mock('~/hooks/useDisplayNextStation', () => ({
  useDisplayNextStation: jest.fn(),
}));
jest.mock('~/hooks/useScale', () => ({
  useScale: () => ({ widthScale: (value: number) => value }),
}));
jest.mock('~/utils/isPass', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));
jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: () => ({ left: 0, width: 100 }),
  useChevronPosition: () => ({}),
  useIncludesLongStationName: jest.requireActual(
    './LineBoard/shared/hooks/useIncludesLongStationName'
  ).useIncludesLongStationName,
}));
jest.mock('./LineBoard/shared/components', () => ({
  BlinkingChevron: () => null,
  EmptyStationNameCell: () => null,
  LineDot: jest.requireActual('./LineBoard/shared/components/LineDot').LineDot,
  StationName: () => null,
}));
jest.mock('./PadLineMarks', () => ({ __esModule: true, default: () => null }));
jest.mock('./Typography', () => ({ __esModule: true, default: () => null }));
jest.mock('./ChevronE231', () => ({ ChevronE231: () => null }));
jest.mock('./NumberingIcon', () => ({ __esModule: true, default: () => null }));
jest.mock('./BarTerminalEast', () => ({ BarTerminalEast: () => null }));
jest.mock('./BarTerminalOdakyu', () => ({ BarTerminalOdakyu: () => null }));

const stations = [
  {
    id: 1,
    groupId: 1,
    name: '美濃太田',
    line: { id: 1, color: '#c3bd44' } as Line,
    stationNumbers: [{ lineSymbolShape: 'SQUARE', stationNumber: 'CI-01' }],
  } as Station,
];

const variants = [
  {
    name: '東京メトロ・東横線',
    Component: LineBoardEast,
    id: 'east',
    props: {},
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: '小田急',
    Component: LineBoardEast,
    id: 'east',
    props: { isOdakyu: true },
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: '埼京線',
    Component: LineBoardSaikyo,
    id: 'saikyo',
    props: {},
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: 'E131',
    Component: LineBoardSaikyo,
    id: 'saikyo',
    props: { isE131: true },
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: 'E231',
    Component: LineBoardE231,
    id: 'e231',
    props: {},
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: '都営',
    Component: LineBoardToei,
    id: 'toei',
    props: {},
    bottom: STATION_NAME_CONTAINER_BOTTOM,
  },
  {
    name: '315系',
    Component: LineBoardJRKyushu,
    id: 'jrkyushu',
    props: { saikyoGradient: true, showNextStopBanner: true },
    bottom: Platform.select({ android: 32, default: 84 }),
  },
  {
    name: 'JR九州',
    Component: LineBoardJRKyushu,
    id: 'jrkyushu',
    props: {},
    bottom: Platform.select({ android: 32, default: 84 }),
  },
];

describe.each(variants)(
  '$name のタブレット配置',
  ({ Component, id, props, bottom }) => {
    const originalOS = Platform.OS;
    beforeEach(() => {
      jest
        .mocked(useAtomValue)
        .mockImplementation((atom) =>
          atom === enabledLanguagesAtom ? ['JA'] : false
        );
    });
    afterEach(() => {
      Platform.OS = originalOS;
      jest.clearAllMocks();
    });

    it('ヘッダー下の高さに追従し、矢印と路線バーの下端を揃える', () => {
      Platform.OS = 'android';
      const result = render(
        <Component
          stations={stations}
          lineColors={['#c3bd44']}
          hasTerminus={false}
          {...props}
        />
      );
      const board = result.getByTestId(`line-board-${id}`);
      expect(board.props.onLayout).toBeUndefined();
      const row = result.UNSAFE_getByType(StationRow).findByType(View);
      expect(StyleSheet.flatten(row.props.style).height).toBe(
        `${(4 / 7) * 100}%`
      );
      const chevron = row.findAllByType(View).find((view) => {
        const style = StyleSheet.flatten(view.props.style);
        return (
          style?.position === 'absolute' &&
          style?.marginLeft === (id === 'toei' ? 15 : 14)
        );
      });
      expect(StyleSheet.flatten(chevron?.props.style).bottom).toBe(
        (bottom ?? 0) - 52
      );
    });

    it('iPad は従来の配置を保つ', () => {
      Platform.OS = 'ios';
      const result = render(
        <Component
          stations={stations}
          lineColors={['#c3bd44']}
          hasTerminus={false}
          {...props}
        />
      );
      const board = result.getByTestId(`line-board-${id}`);
      expect(board.props.onLayout).toBeUndefined();
      expect(StyleSheet.flatten(board.props.style).paddingBottom).toBeCloseTo(
        600 / 3.5
      );
    });
  }
);

describe.each([
  {
    name: '315系',
    Component: LineBoardJRKyushu,
    props: { showNextStopBanner: true },
    id: 'jrkyushu',
  },
  {
    name: '小田急',
    Component: LineBoardEast,
    props: { isOdakyu: true },
    id: 'east',
  },
])('$name の乗換案内と停車案内', ({ Component, props, id }) => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.mocked(getIsPass).mockReset().mockReturnValue(false);
    jest.mocked(useAfterNextStation).mockReset();
    jest.mocked(useDisplayNextStation).mockReset();
  });

  it('乗換案内とバーを同じ駅セルに置き、停車案内を路線図の下端に固定する', () => {
    Platform.OS = 'android';
    const stop = stations[0];
    const pass = { ...stop, id: 2, groupId: 2 };
    jest.mocked(getIsPass).mockImplementation((s) => s?.id === pass.id);
    jest.mocked(useDisplayNextStation).mockReturnValue(stop);
    jest.mocked(useAfterNextStation).mockReturnValue(stop);
    const result = render(
      <Component
        stations={[stop, pass]}
        lineColors={['#c3bd44', '#c3bd44']}
        hasTerminus={false}
        {...props}
      />
    );
    const board = result.getByTestId(`line-board-${id}`);
    const row = result.UNSAFE_getByType(StationRow);
    const cells = row.findAll(
      (node) =>
        node.type === View &&
        StyleSheet.flatten(node.props.style)?.justifyContent === 'flex-end' &&
        StyleSheet.flatten(node.props.style)?.width === 960 / 9
    );
    expect(cells).toHaveLength(2);
    for (const cell of cells) {
      expect(
        cell.findByType(PadLineMarks).props.transferLines[0].nameShort
      ).toBe('名城線');
      expect(
        cell
          .findAllByType(LinearGradient)
          .some(
            (layer) => StyleSheet.flatten(layer.props.style)?.bottom === -52
          )
      ).toBe(true);
    }
    const banner = board
      .findAllByType(LinearGradient)
      .find((layer) => StyleSheet.flatten(layer.props.style)?.bottom === 16);
    expect(banner).toBeDefined();
    expect(StyleSheet.flatten(banner?.props.style).position).toBe('absolute');
    expect(row.findAll((node) => node === banner).length === 0).toBe(true);
  });
});

it('Androidタブレットでは最後の停留所の長い名前もヘッダー下・画面右端の内側に収める', () => {
  const os = Platform.OS;
  Platform.OS = 'android';
  try {
    jest.mocked(useAtomValue).mockReturnValue(false);
    const stops = Array.from({ length: 8 }, (_, i) => ({
      ...stations[0],
      id: i + 1,
      groupId: i + 1,
      name: '伊勢崎市文化会館前',
      stationNumbers: [],
    }));
    const result = render(
      <LineBoardJO stations={stops} lineColors={stops.map(() => '#ff8000')} />
    );
    const labels = result
      .UNSAFE_getAllByType(Typography)
      .filter((label) => label.props.children === stops[0].name);
    expect(labels).toHaveLength(8);
    for (const [i, label] of labels.entries()) {
      const style = StyleSheet.flatten(label.props.style);
      expect(label.props.adjustsFontSizeToFit).toBe(true);
      expect(label.props.numberOfLines).toBe(1);
      expect(style.transformOrigin).toBe('left bottom');
      const rad = (55 * Math.PI) / 180;
      const anchorX = 48 + ((960 - 120) / 8) * (i + 0.5) + 16;
      const anchorY = (600 - 200) * 0.54 - 110;
      expect(style.width).toBeGreaterThan(0);
      expect(
        style.width * Math.sin(rad) + style.height * Math.cos(rad)
      ).toBeLessThanOrEqual(anchorY + 0.001);
      expect(anchorX + style.width * Math.cos(rad)).toBeLessThanOrEqual(
        960.001
      );
    }
  } finally {
    Platform.OS = os;
  }
});

it('JOの乗換案内は路線バーの下端に追従し、駅番号の表示分だけ間隔を空ける', () => {
  const os = Platform.OS;
  Platform.OS = 'android';
  try {
    const stops = [
      stations[0],
      { ...stations[0], id: 2, groupId: 2, stationNumbers: [] },
    ];
    const result = render(
      <LineBoardJO stations={stops} lineColors={['#fff', '#fff']} />
    );
    const positions = result
      .UNSAFE_getAllByType(PadLineMarks)
      .map((mark) => StyleSheet.flatten(mark.parent?.props.style));
    expect(positions).toMatchObject([
      { top: '100%', marginTop: 118 },
      { top: '100%', marginTop: 78 },
    ]);
  } finally {
    Platform.OS = os;
  }
});
