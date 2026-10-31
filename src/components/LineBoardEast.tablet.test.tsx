import { fireEvent, render } from '@testing-library/react-native';
import { Platform, StyleSheet, View } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { STATION_NAME_CONTAINER_BOTTOM } from './LineBoard/shared/styles/commonStyles';
import LineBoardEast from './LineBoardEast';

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

describe('小田急風のタブレット配置', () => {
  const originalOS = Platform.OS;
  afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
  });

  it('ヘッダー下の高さに追従し、矢印と路線バーの下端を揃える', () => {
    Platform.OS = 'android';
    const result = render(
      <LineBoardEast
        stations={stations}
        lineColors={['#c3bd44']}
        hasTerminus={false}
        isOdakyu
      />
    );
    const board = result.getByTestId('line-board-east');
    for (const height of [392, 320, 480]) {
      fireEvent(board, 'layout', { nativeEvent: { layout: { height } } });
      const padding = StyleSheet.flatten(board.props.style).paddingBottom;
      expect(padding).toBeCloseTo(height / 3.5);
      expect(padding).toBeLessThan(600 / 3.5);
      const chevron = result.UNSAFE_getAllByType(View).find((view) => {
        const style = StyleSheet.flatten(view.props.style);
        return style?.position === 'absolute' && style?.marginLeft === 14;
      });
      expect(StyleSheet.flatten(chevron?.props.style).bottom).toBeCloseTo(
        height / 3.5 + (STATION_NAME_CONTAINER_BOTTOM ?? 0) - 52
      );
    }
  });

  it.each([
    ['ios', true],
    ['android', false],
  ] as const)('%s / isOdakyu=%s は従来の配置を保つ', (os, isOdakyu) => {
    Platform.OS = os;
    const result = render(
      <LineBoardEast
        stations={stations}
        lineColors={['#c3bd44']}
        hasTerminus={false}
        isOdakyu={isOdakyu}
      />
    );
    const board = result.getByTestId('line-board-east');
    expect(board.props.onLayout).toBeUndefined();
    expect(StyleSheet.flatten(board.props.style).paddingBottom).toBeCloseTo(
      600 / 3.5
    );
  });
});
