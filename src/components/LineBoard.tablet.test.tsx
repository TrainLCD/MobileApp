import { fireEvent, render } from '@testing-library/react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAtomValue } from 'jotai';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { useAfterNextStation } from '~/hooks/useAfterNextStation';
import { useDisplayNextStation } from '~/hooks/useDisplayNextStation';
import {
  enabledLanguagesAtom,
  leftStationsAtom,
} from '~/store/atoms/navigation';
import { isEnAtom } from '~/store/selectors/isEn';
import getIsPass from '~/utils/isPass';
import { StationRow } from './LineBoard/shared/components/StationRow';
import {
  HORIZONTAL_STATION_NAME_FONT_SIZE,
  STATION_NAME_CONTAINER_BOTTOM,
} from './LineBoard/shared/styles/commonStyles';
import LineBoardE231 from './LineBoardE231';
import LineBoardEast from './LineBoardEast';
import LineBoardJO from './LineBoardJO';
import LineBoardJRKyushu from './LineBoardJRKyushu';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardToei from './LineBoardToei';
import LineBoardWest from './LineBoardWest';
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
  useCurrentStation: () => ({ groupId: 1 }),
  useNextStation: () => null,
  usePreviousStation: () => null,
  useHasPassStationInRegion: () => false,
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

it('Androidタブレットでは長い停留所名を縮小せず、表示幅で折り返す', () => {
  const os = Platform.OS;
  Platform.OS = 'android';
  try {
    jest.mocked(useAtomValue).mockReturnValue(false);
    const stops = Array.from({ length: 8 }, (_, i) => ({
      ...stations[0],
      id: i + 1,
      groupId: i + 1,
      name: '伊勢崎市文化会館前',
      nameRoman: 'Culture Hall',
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
      expect(label.props.adjustsFontSizeToFit).toBeFalsy();
      expect(label.props.numberOfLines).toBeUndefined();
      expect(style.height).toBeUndefined();
      expect(style.transformOrigin).toBe('left bottom');
      const rad = (55 * Math.PI) / 180;
      const anchorX = 48 + ((960 - 120) / 8) * (i + 0.5) + 16;
      // 600dpからヘッダー200dpを除いた400dpのうち、30%だけ持ち上げる。
      // バー上端まで184dp、駅名の基点まで170dpを使える。
      const textHeight = Math.ceil(HORIZONTAL_STATION_NAME_FONT_SIZE * 1.4);
      const availableWidth = (170 - textHeight * Math.cos(rad)) / Math.sin(rad);
      expect(style.width).toBeCloseTo(
        Math.min(availableWidth, (960 - anchorX) / Math.cos(rad))
      );
      expect(anchorX + style.width * Math.cos(rad)).toBeLessThanOrEqual(
        960.001
      );
    }
    const width = StyleSheet.flatten(labels[0].props.style).width;
    const rad = (55 * Math.PI) / 180;
    for (const lines of [2, 3, 1]) {
      const height = lines * Math.ceil(HORIZONTAL_STATION_NAME_FONT_SIZE * 1.4);
      fireEvent(labels[0], 'layout', {
        nativeEvent: { layout: { width, height } },
      });
      const board = StyleSheet.flatten(
        result.getByTestId('line-board-jo').props.style
      );
      const shift = board.transform?.[0].translateY ?? 0;
      expect(shift).toBe(
        Math.max(
          0,
          Math.ceil(width * Math.sin(rad) + height * Math.cos(rad) - 170)
        )
      );
    }
    const englishLabel = result
      .UNSAFE_getAllByType(Typography)
      .find((label) => label.props.children === 'Culture Hall');
    expect(englishLabel?.props.accessibilityElementsHidden).toBe(true);
    if (!englishLabel) throw new Error('英語駅名がありません');
    fireEvent(englishLabel, 'layout', {
      nativeEvent: { layout: { width, height: 120 } },
    });
    const boardStyle = () =>
      StyleSheet.flatten(result.getByTestId('line-board-jo').props.style);
    const shift = boardStyle().transform[0].translateY;
    expect(shift).toBeGreaterThan(0);
    for (const english of [true, false]) {
      jest
        .mocked(useAtomValue)
        .mockImplementation((atom) => atom === isEnAtom && english);
      result.rerender(
        <LineBoardJO stations={stops} lineColors={stops.map(() => '#ff8000')} />
      );
      expect(
        result
          .UNSAFE_getAllByType(Typography)
          .find((label) => label.props.children === 'Culture Hall')?.props
          .accessibilityElementsHidden
      ).toBe(!english);
      expect(boardStyle().transform[0].translateY).toBe(shift);
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

it('JRWの駅名は日英を切り替えてもセルの高さと下端を変えない', () => {
  const os = Platform.OS;
  Platform.OS = 'android';
  try {
    const stops = [
      { ...stations[0], name: '大阪', nameRoman: 'Osaka-Central-Station' },
    ];
    const component = () => (
      <LineBoardWest stations={stops} lineColors={['#00a7db']} />
    );
    const setLanguage = (english: boolean) =>
      jest.mocked(useAtomValue).mockImplementation((atom) => {
        if (atom === leftStationsAtom) return stops;
        return atom === isEnAtom && english;
      });
    setLanguage(false);
    const result = render(component());
    for (const english of [false, true, false]) {
      setLanguage(english);
      result.rerender(
        <LineBoardWest stations={[...stops]} lineColors={['#00a7db']} />
      );
      const label = result.getByTestId('station-name-wrapper-west');
      const style = StyleSheet.flatten(label.props.style);
      expect(style).toMatchObject({
        position: 'absolute',
        bottom: english ? 24 : 0,
        left: english ? 24 : 0,
        right: english ? undefined : 0,
      });
      if (english) {
        expect(style.transformOrigin).toBe('left bottom');
        const text = result
          .UNSAFE_getAllByType(Typography)
          .find((node) => node.props.children === 'Osaka-\nCentral-\nStation');
        expect(text).toBeDefined();
        expect(StyleSheet.flatten(text?.props.style).marginBottom ?? 0).toBe(0);
      }
      expect(style.transform).toEqual(
        english ? [{ rotate: '-55deg' }] : undefined
      );
      expect(
        StyleSheet.flatten(
          result.getByTestId('station-name-cell-west').props.style
        ).height
      ).toBe('100%');
    }
  } finally {
    Platform.OS = os;
  }
});
