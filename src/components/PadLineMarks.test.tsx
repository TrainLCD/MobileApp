import { StyleSheet, type ViewStyle } from 'react-native';
import type { Line, Station } from '~/@types/graphql';
import { APP_THEME, type AppTheme } from '~/models/Theme';

jest.mock('jotai', () => ({
  ...jest.requireActual('jotai'),
  useAtomValue: jest.fn(() => false),
}));

jest.mock('~/hooks', () => ({
  useGetLineMark: jest.fn(() => () => null),
  useIsDifferentStationName: jest.fn(() => () => false),
}));

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: true,
}));

jest.mock('./TransferLineDot', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./TransferLineMark', () => ({
  __esModule: true,
  default: () => null,
}));

const station = { id: 1, groupId: 1, name: '宝積寺' } as unknown as Station;
const transferLines = [
  { id: 11, nameShort: '烏山線', nameRoman: 'Karasuyama Line' },
] as unknown as Line[];

type RenderedNode = {
  props: { style?: unknown };
  children: RenderedNode[] | null;
};

// stylesWest の Platform.select はモジュール読み込み時に評価されるため、
// OS を切り替えたうえで隔離したモジュールレジストリから読み直す。
// React とレンダラーも同じレジストリから取らないと、フックが別の React を参照して落ちる
const renderOn = (os: 'ios' | 'android', theme?: AppTheme): RenderedNode => {
  let tree: RenderedNode | null = null;
  jest.isolateModules(() => {
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', {
      get: () => os,
      configurable: true,
    });
    jest.spyOn(Platform, 'select').mockImplementation((...args: unknown[]) => {
      const spec = args[0] as Record<string, unknown>;
      return os in spec ? spec[os] : spec.default;
    });
    const React = require('react');
    const { render } = require('@testing-library/react-native/pure');
    const PadLineMarks = require('./PadLineMarks').default;
    tree = render(
      React.createElement(PadLineMarks, {
        shouldGrayscale: false,
        transferLines,
        station,
        theme,
      })
    ).toJSON();
  });
  if (!tree) {
    throw new Error('PadLineMarks rendered nothing');
  }
  return tree;
};

const marginTopOf = (
  node: RenderedNode | null | undefined
): number | undefined =>
  StyleSheet.flatten(node?.props.style as ViewStyle | undefined)?.marginTop as
    | number
    | undefined;

describe('PadLineMarks', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(['ios', 'android'] as const)(
    '%s では路線バーとの間隔(外枠のmarginTop)が8になる',
    (os) => {
      expect(marginTopOf(renderOn(os))).toBe(8);
    }
  );

  it.each([
    ['ios', 6],
    ['android', 8],
  ] as const)(
    '%s のJR西日本風では黒バーのmarginTopが%iになる',
    (os, expected) => {
      const tree = renderOn(os, APP_THEME.JR_WEST);
      expect(marginTopOf(tree.children?.[0])).toBe(expected);
    }
  );

  it('AndroidのJR西日本風では外枠と黒バーの合計が#5639で調整した16のまま', () => {
    const tree = renderOn('android', APP_THEME.JR_WEST);
    expect(
      (marginTopOf(tree) ?? 0) + (marginTopOf(tree.children?.[0]) ?? 0)
    ).toBe(16);
  });
});
