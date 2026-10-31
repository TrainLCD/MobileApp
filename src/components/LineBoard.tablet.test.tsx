import { fireEvent, render } from '@testing-library/react-native';
import { useAtomValue } from 'jotai';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { enabledLanguagesAtom } from '~/store/atoms/navigation';
import { STATION_NAME_CONTAINER_BOTTOM } from './LineBoard/shared/styles/commonStyles';
import LineBoardE231 from './LineBoardE231';
import LineBoardEast from './LineBoardEast';
import LineBoardJRKyushu from './LineBoardJRKyushu';
import LineBoardSaikyo from './LineBoardSaikyo';
import LineBoardToei from './LineBoardToei';

jest.mock('~/utils/isTablet', () => ({ __esModule: true, default: true }));
jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => false),
}));
jest.mock('~/hooks', () => ({
  useLandscapeWindowDimensions: () => ({ width: 960, height: 600 }),
  useCurrentLine: () => ({ id: 1, color: '#c3bd44' }),
  useDisplayCurrentStation: () => ({ groupId: 1 }),
  useEstimateArrivalTimes: () => ({ route: null }),
  useEstimatedMinutesByStationId: () => new Map(),
  useTransferLinesFromStation: () => [],
  useStationNumberIndexFunc: () => () => 0,
}));
jest.mock('~/hooks/useAfterNextStation', () => ({
  useAfterNextStation: () => undefined,
}));
jest.mock('~/hooks/useDisplayNextStation', () => ({
  useDisplayNextStation: () => undefined,
}));
jest.mock('~/hooks/useScale', () => ({
  useScale: () => ({ widthScale: (value: number) => value }),
}));
jest.mock('~/utils/isPass', () => ({ __esModule: true, default: () => false }));
jest.mock('./LineBoard/shared/hooks/useBarStyles', () => ({
  useBarStyles: () => ({ left: 0, width: 100 }),
  useChevronPosition: () => ({}),
  useIncludesLongStationName: () => false,
}));
jest.mock('./LineBoard/shared/components', () => ({
  BlinkingChevron: () => null,
  EmptyStationNameCell: () => null,
  LineDot: () => null,
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
      for (const height of [392, 320, 480]) {
        fireEvent(board, 'layout', { nativeEvent: { layout: { height } } });
        const padding = StyleSheet.flatten(board.props.style).paddingBottom;
        expect(padding).toBeCloseTo(height / 3.5);
        expect(padding).toBeLessThan(600 / 3.5);
        const chevron = result.UNSAFE_getAllByType(View).find((view) => {
          const style = StyleSheet.flatten(view.props.style);
          return (
            style?.position === 'absolute' &&
            style?.marginLeft === (id === 'toei' ? 15 : 14)
          );
        });
        expect(StyleSheet.flatten(chevron?.props.style).bottom).toBeCloseTo(
          height / 3.5 + (bottom ?? 0) - 52
        );
      }
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
