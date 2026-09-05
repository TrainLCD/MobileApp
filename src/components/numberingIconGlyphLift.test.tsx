import { render } from '@testing-library/react-native';
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import { MARK_SHAPE, NUMBERING_ICON_SIZE } from '~/constants';

jest.mock('~/utils/isTablet', () => ({
  __esModule: true,
  default: false,
}));

jest.mock('react-native-svg', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => <View {...(props as object)} />,
    Ellipse: (props: unknown) => <View {...(props as object)} />,
    Polygon: (props: unknown) => <View {...(props as object)} />,
    Svg: (props: unknown) => <View {...(props as object)} />,
  };
});

// 補正は StyleSheet.create の評価時に決まるため、アイコンを読み込む前に
// Android へ切り替えておく必要がある(iOSで補正が入らないことは
// numberingGlyphLift のユニットテストで担保している)
Object.defineProperty(Platform, 'OS', { value: 'android' });
const NumberingIcon = require('./NumberingIcon').default;

/**
 * Android でグリフの上下ズレを打ち消す対象。`lineHeight` を指定したテキストは
 * RN Android の CustomLineHeightSpan を通るため、フォントごとの補正が必要になる。
 *
 * ここに無いシェイプ(REVERSED_SQUARE_HORIZONTAL / REVERSED_ROUND_HORIZONTAL /
 * NEW_SHUTTLE / KEIHAN / KEIO / SMR / NISHITETSU / IZUHAKONE /
 * MONOCHROME_ROUND)は、実機計測でズレが 1dp 未満だったか、`lineHeight` を
 * 指定しておらず CustomLineHeightSpan を通らないため対象外。
 */
const CORRECTED = [
  { shape: MARK_SHAPE.SQUARE, stationNumber: 'JY-01' },
  { shape: MARK_SHAPE.REVERSED_SQUARE_WEST, stationNumber: 'A-01' },
  { shape: MARK_SHAPE.KEISEI, stationNumber: 'KS-01' },
  { shape: MARK_SHAPE.SANYO, stationNumber: 'SY-01' },
  { shape: MARK_SHAPE.HANKYU, stationNumber: 'HK-01' },
  { shape: MARK_SHAPE.NTL, stationNumber: 'NT-01' },
  { shape: MARK_SHAPE.ODAKYU, stationNumber: 'OH-01' },
  { shape: MARK_SHAPE.ROUND, stationNumber: 'M-01' },
  { shape: MARK_SHAPE.ROUND_HORIZONTAL, stationNumber: 'M-01' },
  { shape: MARK_SHAPE.REVERSED_ROUND, stationNumber: 'N-01' },
  { shape: MARK_SHAPE.KEIKYU, stationNumber: 'KK-01' },
  { shape: MARK_SHAPE.REVERSED_SQUARE, stationNumber: 'A-01' },
  { shape: MARK_SHAPE.HALF_SQUARE, stationNumber: 'A-01' },
  { shape: MARK_SHAPE.NANKAI, stationNumber: 'NK-01' },
  { shape: MARK_SHAPE.TWR, stationNumber: 'R-01' },
  { shape: MARK_SHAPE.HANSHIN, stationNumber: 'HS-01' },
];

/** lineHeight を指定しているテキストだけが補正の対象になる */
const linedTextStyles = (shape: string, stationNumber: string) =>
  render(
    <NumberingIcon
      lineColor="#0072bc"
      shape={shape}
      size={NUMBERING_ICON_SIZE.LARGE}
      stationNumber={stationNumber}
    />
  )
    .UNSAFE_getAllByType(Text)
    .map((node) => (StyleSheet.flatten(node.props.style) ?? {}) as TextStyle)
    .filter((style) => typeof style.lineHeight === 'number');

describe('ナンバリングアイコンのグリフ位置補正', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe.each(CORRECTED)('$shape', ({ shape, stationNumber }) => {
    it('lineHeightを指定した全てのテキストに補正が入る', () => {
      const styles = linedTextStyles(shape, stationNumber);
      expect(styles.length).toBeGreaterThan(0);
      for (const style of styles) {
        expect(style.transform).toEqual([{ translateY: expect.any(Number) }]);
      }
    });

    it('記号と番号で同じ補正量を使い両者の間隔を変えない', () => {
      // HALF_SQUARE は番号が独立した白地の箱に入るため行ごとに値が異なる
      if (shape === MARK_SHAPE.HALF_SQUARE) {
        return;
      }
      const lifts = linedTextStyles(shape, stationNumber).map(
        (style) => (style.transform as { translateY: number }[])[0]
      );
      for (const lift of lifts) {
        expect(lift).toEqual(lifts[0]);
      }
    });
  });
});
